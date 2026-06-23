import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../middleware/auth.js'
import { fetchAwsData } from '../services/awsFetcher.js'
import { runAuditEngine } from '../services/auditEngine.js'

const router = Router()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

router.use(requireAuth)

// POST /api/audit/run
router.post('/run', async (req, res, next) => {
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

    res.json({ success: true, reportId: report.id, findings, totalSavings })
  } catch (err) {
    next(err)
  }
})

export default router
