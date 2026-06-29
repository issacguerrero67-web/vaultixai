import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { fetchAwsData } from './awsFetcher.js'
import { runAuditEngine } from './auditEngine.js'
import { sendAuditReport } from './emailService.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

let isRunning = false

async function runMonthlyRescans() {
  if (isRunning) {
    console.log('[cron] Previous rescan still in progress — skipping this run')
    return
  }
  isRunning = true
  console.log('[cron] Starting monthly rescan batch')

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Find accounts due for a rescan:
    // - profile has stripe_customer_id (paid user)
    // - last_audit_at is null or older than 30 days
    const { data: accounts, error } = await supabase
      .from('aws_accounts')
      .select('id, user_id, account_name, role_arn, external_id, last_audit_at, profiles(email, full_name, stripe_customer_id)')
      .not('profiles.stripe_customer_id', 'is', null)
      .or(`last_audit_at.is.null,last_audit_at.lt.${thirtyDaysAgo.toISOString()}`)

    if (error) {
      console.error('[cron] Failed to query accounts:', error.message)
      return
    }

    console.log(`[cron] Found ${accounts?.length ?? 0} accounts due for rescan`)

    for (const account of (accounts ?? [])) {
      try {
        console.log(`[cron] Scanning account id=${account.id}`)

        const awsData = await fetchAwsData(account.role_arn, account.external_id)
        const findings = await runAuditEngine(awsData)
        const totalSavings = findings.reduce(
          (sum, f) => sum + (typeof f.estimatedMonthlySavings === 'number' ? f.estimatedMonthlySavings : 0),
          0
        )

        const { error: reportErr } = await supabase
          .from('audit_reports')
          .insert({
            user_id: account.user_id,
            aws_account_id: account.id,
            findings,
            status: 'complete',
            total_savings: totalSavings,
            created_at: new Date().toISOString(),
          })

        if (reportErr) {
          console.error(`[cron] Failed to save report for account id=${account.id}:`, reportErr.message)
        }

        await supabase
          .from('aws_accounts')
          .update({ last_audit_at: new Date().toISOString() })
          .eq('id', account.id)

        const userEmail = account.profiles?.email
        if (userEmail) {
          try {
            const { data: userPrefs } = await supabase
              .from('profiles')
              .select('notification_preferences, webhook_url')
              .eq('id', account.user_id)
              .single()

            const shouldSendEmail = userPrefs?.notification_preferences?.monthly_summary !== false
            if (shouldSendEmail) {
              await sendAuditReport(userEmail, findings, totalSavings, account.account_name)
              console.log(`[cron] Report email sent to ${userEmail}`)
            } else {
              console.log(`[cron] Email skipped (user opted out): ${userEmail}`)
            }
          } catch (emailErr) {
            console.error(`[cron] Email failed for account id=${account.id}:`, emailErr.message)
          }
        }

        try {
          const { data: webhookProfile } = await supabase
            .from('profiles')
            .select('webhook_url')
            .eq('id', account.user_id)
            .single()

          if (webhookProfile?.webhook_url) {
            await fetch(webhookProfile.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'audit.complete',
                account_id: account.id,
                account_name: account.account_name,
                findings_count: findings.length,
                total_savings: totalSavings,
                timestamp: new Date().toISOString(),
              }),
            })
            console.log(`[cron] Webhook fired for account id=${account.id}`)
          }
        } catch (webhookErr) {
          console.error(`[cron] Webhook failed for account id=${account.id}:`, webhookErr.message)
        }

        console.log(`[cron] Completed account id=${account.id} — ${findings.length} findings, $${totalSavings}/mo savings`)
      } catch (err) {
        console.error(`[cron] Error processing account id=${account.id}:`, err.message)
      }
    }
  } finally {
    isRunning = false
    console.log('[cron] Monthly rescan batch complete')
  }
}

export function startCronJobs() {
  // Run daily at 3am server time
  cron.schedule('0 3 * * *', runMonthlyRescans)
  console.log('[cron] Monthly rescan job scheduled (daily at 3am)')
}
