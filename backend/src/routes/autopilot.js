import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../middleware/auth.js'
import { generateAutopilotActions, executeAction, rollbackAction } from '../services/autopilotEngine.js'

const router = Router()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

router.use(requireAuth)

// Generate actions from latest audit
router.post('/generate', async (req, res, next) => {
  try {
    const { aws_account_id } = req.body
    const result = await generateAutopilotActions(req.user.id, aws_account_id)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// Get all actions for an account
router.get('/status/:aws_account_id', async (req, res, next) => {
  try {
    const { aws_account_id } = req.params
    const { data: actions } = await supabase
      .from('autopilot_actions')
      .select('*')
      .eq('aws_account_id', aws_account_id)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
    res.json({ actions })
  } catch (err) {
    next(err)
  }
})

// Approve single action
router.post('/approve', async (req, res, next) => {
  try {
    const { action_id, aws_account_id } = req.body
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
    next(err)
  }
})

// Skip single action
router.post('/skip', async (req, res, next) => {
  try {
    const { action_id, aws_account_id } = req.body
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
    next(err)
  }
})

// Approve ALL pending actions (requires confirm token)
router.post('/approve-all', async (req, res, next) => {
  try {
    const { aws_account_id, confirm } = req.body
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
    next(err)
  }
})

// Execute all approved actions
router.post('/execute', async (req, res, next) => {
  try {
    const { aws_account_id } = req.body
    const { data: approved } = await supabase
      .from('autopilot_actions')
      .select('id')
      .eq('aws_account_id', aws_account_id)
      .eq('user_id', req.user.id)
      .eq('status', 'approved')

    if (!approved || approved.length === 0) {
      return res.status(400).json({ error: 'No approved actions to execute' })
    }

    const results = []
    for (const action of approved) {
      try {
        const result = await executeAction(action.id, req.user.id)
        results.push({ action_id: action.id, success: true, result })
      } catch (err) {
        results.push({ action_id: action.id, success: false, error: err.message })
      }
    }

    res.json({ results })
  } catch (err) {
    next(err)
  }
})

// Rollback a completed action
router.post('/rollback', async (req, res, next) => {
  try {
    const { action_id } = req.body
    const result = await rollbackAction(action_id, req.user.id)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
