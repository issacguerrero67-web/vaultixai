import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// DELETE /api/account/aws-accounts — disconnect all AWS accounts for user
router.delete('/aws-accounts', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('aws_accounts')
      .delete()
      .eq('user_id', req.user.id)
    if (error) throw error
    res.json({ success: true, message: 'All AWS accounts disconnected.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/account/user — delete user account and all data
router.delete('/user', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { confirm } = req.body

    if (confirm !== 'DELETE') {
      return res.status(400).json({ error: 'Must send confirm: "DELETE"' })
    }

    await supabase.from('autopilot_log').delete().eq('user_id', userId)
    await supabase.from('autopilot_actions').delete().eq('user_id', userId)
    await supabase.from('audit_reports').delete().eq('user_id', userId)
    await supabase.from('aws_accounts').delete().eq('user_id', userId)
    await supabase.from('api_keys').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)

    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw error

    res.json({ success: true, message: 'Account deleted.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
