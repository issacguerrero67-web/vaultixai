import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '../middleware/auth.js'
import { generateAutopilotActions, executeAction, rollbackAction } from '../services/autopilotEngine.js'

const router = Router()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

router.use(requireAuth)

// Generate actions from latest audit
router.post('/generate', async (req, res, next) => {
  try {
    const { aws_account_id } = req.body
    const userId = req.user.id

    if (!aws_account_id || !UUID_REGEX.test(aws_account_id)) {
      return res.status(400).json({ error: 'Invalid aws_account_id.' })
    }

    // Ownership check
    const { data: accountCheck } = await supabase
      .from('aws_accounts')
      .select('id')
      .eq('id', aws_account_id)
      .eq('user_id', userId)
      .single()

    if (!accountCheck) {
      return res.status(403).json({ error: 'Access denied.' })
    }

    const result = await generateAutopilotActions(userId, aws_account_id)
    res.json(result)
  } catch (err) {
    console.error('[Autopilot] generate error:', err.message)
    next(err)
  }
})

// Get all actions for an account
router.get('/status/:aws_account_id', async (req, res, next) => {
  try {
    const { aws_account_id } = req.params

    if (!UUID_REGEX.test(aws_account_id)) {
      return res.status(400).json({ error: 'Invalid aws_account_id.' })
    }

    const { data: actions } = await supabase
      .from('autopilot_actions')
      .select('*')
      .eq('aws_account_id', aws_account_id)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
    res.json({ actions })
  } catch (err) {
    console.error('[Autopilot] status error:', err.message)
    next(err)
  }
})

// Approve single action
router.post('/approve', async (req, res, next) => {
  try {
    const { action_id, aws_account_id } = req.body

    if (!action_id || !UUID_REGEX.test(action_id)) {
      return res.status(400).json({ error: 'Invalid action_id.' })
    }
    if (aws_account_id && !UUID_REGEX.test(aws_account_id)) {
      return res.status(400).json({ error: 'Invalid aws_account_id.' })
    }

    const { data: existingAction, error: fetchError } = await supabase
      .from('autopilot_actions')
      .select('id, user_id')
      .eq('id', action_id)
      .single()

    if (fetchError || !existingAction) {
      return res.status(404).json({ error: 'Action not found.' })
    }
    if (existingAction.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized.' })
    }

    await supabase.from('autopilot_actions')
      .update({ status: 'approved' })
      .eq('id', action_id)
      .eq('user_id', req.user.id)
    await supabase.from('autopilot_log').insert({
      user_id: req.user.id,
      action_id,
      aws_account_id,
      event_type: 'approved',
    })
    res.json({ success: true })
  } catch (err) {
    console.error('[Autopilot] approve error:', err.message)
    next(err)
  }
})

// Skip single action
router.post('/skip', async (req, res, next) => {
  try {
    const { action_id, aws_account_id } = req.body

    if (!action_id || !UUID_REGEX.test(action_id)) {
      return res.status(400).json({ error: 'Invalid action_id.' })
    }

    const { data: existingAction, error: fetchError } = await supabase
      .from('autopilot_actions')
      .select('id, user_id')
      .eq('id', action_id)
      .single()

    if (fetchError || !existingAction) {
      return res.status(404).json({ error: 'Action not found.' })
    }
    if (existingAction.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized.' })
    }

    await supabase.from('autopilot_actions')
      .update({ status: 'skipped' })
      .eq('id', action_id)
      .eq('user_id', req.user.id)
    await supabase.from('autopilot_log').insert({
      user_id: req.user.id,
      action_id,
      aws_account_id,
      event_type: 'skipped',
    })
    res.json({ success: true })
  } catch (err) {
    console.error('[Autopilot] skip error:', err.message)
    next(err)
  }
})

// Approve ALL pending actions (requires confirm token)
router.post('/approve-all', async (req, res, next) => {
  try {
    const { aws_account_id, confirm } = req.body

    if (!aws_account_id || !UUID_REGEX.test(aws_account_id)) {
      return res.status(400).json({ error: 'Invalid aws_account_id.' })
    }
    if (confirm !== 'CONFIRM') {
      return res.status(400).json({ error: 'Must send confirm: "CONFIRM" to approve all actions' })
    }

    const { data: actions } = await supabase
      .from('autopilot_actions')
      .update({ status: 'approved' })
      .eq('aws_account_id', aws_account_id)
      .eq('user_id', req.user.id)
      .eq('status', 'pending')
      .select()
    await supabase.from('autopilot_log').insert({
      user_id: req.user.id,
      aws_account_id,
      event_type: 'approve_all',
      details: { count: actions?.length || 0 },
    })
    res.json({ success: true, approved: actions?.length || 0 })
  } catch (err) {
    console.error('[Autopilot] approve-all error:', err.message)
    next(err)
  }
})

// Execute all approved actions
router.post('/execute', async (req, res, next) => {
  try {
    const { aws_account_id } = req.body
    const userId = req.user.id

    if (!aws_account_id || !UUID_REGEX.test(aws_account_id)) {
      return res.status(400).json({ error: 'Invalid aws_account_id.' })
    }

    // Ownership check — only fetch actions belonging to this user for this account
    const { data: approved } = await supabase
      .from('autopilot_actions')
      .select('id')
      .eq('aws_account_id', aws_account_id)
      .eq('user_id', userId)
      .eq('status', 'approved')

    if (!approved || approved.length === 0) {
      return res.status(400).json({ error: 'No approved actions to execute' })
    }

    const results = []
    for (const action of approved) {
      try {
        const result = await executeAction(action.id, userId)
        results.push({ action_id: action.id, success: true, result })
      } catch (err) {
        console.error('[Autopilot] execute action error:', err.message)
        results.push({ action_id: action.id, success: false, error: 'Action execution failed.' })
      }
    }

    res.json({ results })
  } catch (err) {
    console.error('[Autopilot] execute error:', err.message)
    next(err)
  }
})

// Rollback a completed action
router.post('/rollback', async (req, res, next) => {
  try {
    const { action_id } = req.body

    if (!action_id || !UUID_REGEX.test(action_id)) {
      return res.status(400).json({ error: 'Invalid action_id.' })
    }

    const result = await rollbackAction(action_id, req.user.id)
    res.json(result)
  } catch (err) {
    console.error('[Autopilot] rollback error:', err.message)
    next(err)
  }
})

// AI chat — answers questions about the user's specific audit findings
router.post('/chat', async (req, res) => {
  try {
    const userId = req.user.id
    const { message, aws_account_id, conversation_history = [] } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' })
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long. Maximum 1000 characters.' })
    }
    if (aws_account_id && !UUID_REGEX.test(aws_account_id)) {
      return res.status(400).json({ error: 'Invalid aws_account_id.' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, plan, audit_unlocked')
      .eq('id', userId)
      .single()

    if (!profile?.audit_unlocked) {
      return res.status(403).json({ error: 'Autopilot requires an unlocked audit. Complete payment to access AI chat.' })
    }

    const { data: account } = await supabase
      .from('aws_accounts')
      .select('account_name, role_arn, last_audit_at')
      .eq('id', aws_account_id)
      .eq('user_id', userId)
      .single()

    const { data: report } = await supabase
      .from('audit_reports')
      .select('findings, total_savings, created_at')
      .eq('aws_account_id', aws_account_id)
      .eq('user_id', userId)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const findings = report?.findings || []
    const totalSavings = report?.total_savings || 0
    const lastAudit = report?.created_at
      ? new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'No audit run yet'

    const findingsSummary = findings.length > 0
      ? findings.map((f, i) =>
          `${i + 1}. [${f.severity.toUpperCase()}] ${f.category} — ${f.title}${f.estimatedMonthlySavings > 0 ? ` (saves $${f.estimatedMonthlySavings}/mo)` : ''}\n   ${f.description}\n   Fix: ${f.recommendation}`
        ).join('\n\n')
      : 'No findings available yet. Run an audit first.'

    const systemPrompt = `You are the Vaultix AI Assistant — an AWS cost optimization specialist embedded directly in the Vaultix platform. You have full context of this customer's AWS environment and audit findings.

CUSTOMER CONTEXT:
- Name: ${profile?.full_name || 'there'}
- Plan: ${profile?.plan || 'Standard'}
- AWS Account: ${account?.account_name || 'Connected Account'}
- Last Audit: ${lastAudit}
- Total Potential Savings: $${totalSavings}/mo
- Total Findings: ${findings.length}

THEIR ACTUAL FINDINGS:
${findingsSummary}

YOUR ROLE:
- Answer questions about their specific AWS findings using the exact data above
- Explain AWS concepts in plain, accessible English
- Help prioritize which fixes to tackle first based on impact and effort
- Give specific step-by-step instructions referencing their actual resource IDs when available
- Be concise, friendly, and technically accurate
- Always reference their real data — never invent resource IDs or savings numbers
- If asked about something outside their findings, be honest about it
- Keep responses focused and actionable — no unnecessary filler
- Format responses with clear structure when listing steps or multiple items

You are not a general-purpose AI. You are their personal AWS cost optimization advisor.`

    const messages = [
      ...conversation_history,
      { role: 'user', content: message },
    ]

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    res.json({ reply: response.content[0].text })
  } catch (err) {
    console.error('[Autopilot] chat error:', err.message)
    res.status(500).json({ error: 'An internal error occurred. Please try again.' })
  }
})

export default router
