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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const auditLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.id || req.socket.remoteAddress,
  skip: (req) => !!req.user?.id,
  message: { error: 'Too many audit requests. Please wait before running another audit.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
})

router.use(requireAuth)

// POST /api/audit/run
router.post('/run', auditLimiter, async (req, res, next) => {
  try {
    const { aws_account_id } = req.body
    const userId = req.user.id

    // Validate aws_account_id
    if (!aws_account_id || !UUID_REGEX.test(aws_account_id)) {
      return res.status(400).json({ error: 'Invalid aws_account_id.' })
    }

    // Ownership check — verify this account belongs to the requesting user
    const { data: accountCheck, error: accountError } = await supabase
      .from('aws_accounts')
      .select('id, user_id')
      .eq('id', aws_account_id)
      .eq('user_id', userId)
      .single()

    if (accountError || !accountCheck) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    // Fetch full account details
    const { data: accounts, error: dbError } = await supabase
      .from('aws_accounts')
      .select('*')
      .eq('id', aws_account_id)
      .eq('user_id', userId)
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
        user_id: userId,
        aws_account_id: account.id,
        findings,
        status: 'complete',
        total_savings: totalSavings,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (reportError) {
      console.error('[Audit] Failed to save audit report:', reportError.message)
      return res.json({ success: true, reportId: null, findings, totalSavings })
    }

    try {
      await sendAuditReport(req.user.email, findings, totalSavings, account.account_name)
      console.log('[Audit] Report email sent to:', req.user.email)
    } catch (emailErr) {
      console.error('[Audit] Failed to send audit email:', emailErr.message)
    }

    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('webhook_url, notification_preferences')
        .eq('id', userId)
        .single()

      if (userProfile?.webhook_url && userProfile?.notification_preferences?.audit_complete !== false) {
        const webhookPayload = {
          event: 'audit.complete',
          timestamp: new Date().toISOString(),
          data: {
            account_name: account.account_name,
            findings_count: findings.length,
            total_savings: totalSavings,
            severity_counts: {
              high: findings.filter(f => f.severity === 'high').length,
              medium: findings.filter(f => f.severity === 'medium').length,
              low: findings.filter(f => f.severity === 'low').length,
            },
            report_url: `${process.env.FRONTEND_URL}/dashboard/reports`,
          },
        }

        await fetch(userProfile.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        })
      }
    } catch (webhookErr) {
      console.error('[Audit] Webhook delivery failed:', webhookErr.message)
    }

    res.json({ success: true, reportId: report.id, findings, totalSavings })
  } catch (err) {
    console.error('[Audit] Unhandled error:', err.message, err.stack)
    next(err)
  }
})

export default router
