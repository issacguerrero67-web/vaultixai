import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../middleware/auth.js'
import { fetchAwsData } from '../services/awsFetcher.js'
import { runAuditEngine } from '../services/auditEngine.js'
import { sendAuditReport } from '../services/emailService.js'

const router = Router()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const auditLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'Too many audit requests. Please wait before running another audit.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
})

router.use(requireAuth)

// POST /api/audit/run
router.post('/run', auditLimiter, async (req, res, next) => {
  try {
    // Look up the user's first connected AWS account
    const { data: accounts, error: dbError } = await supabase
      .from('aws_accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .limit(1)

    if (dbError) return next(dbError)

    if (!accounts || accounts.length === 0) {
      return res.status(404).json({ error: 'No AWS account connected' })
    }

    const account = accounts[0]
    const { role_arn, external_id } = account

    const awsData = await fetchAwsData(role_arn, external_id)

    const findings = await runAuditEngine(awsData)

    const totalSavings = findings.reduce(
      (sum, f) => sum + (typeof f.estimatedMonthlySavings === 'number' ? f.estimatedMonthlySavings : 0),
      0
    )

    const { data: report, error: reportError } = await supabase
      .from('audit_reports')
      .insert({
        user_id: req.user.id,
        aws_account_id: account.id,
        findings,
        status: 'complete',
        total_savings: totalSavings,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (reportError) {
      console.error('Failed to save audit report:', reportError.message)
      // Still return findings even if saving fails
      return res.json({ success: true, reportId: null, findings, totalSavings })
    }

    try {
      await sendAuditReport(req.user.email, findings, totalSavings, account.account_name)
      console.log('Audit report email sent to:', req.user.email)
    } catch (emailErr) {
      console.error('Failed to send audit email:', emailErr.message)
      // Don't fail the request if email fails
    }

    res.json({ success: true, reportId: report.id, findings, totalSavings })
  } catch (err) {
    next(err)
  }
})

export default router
