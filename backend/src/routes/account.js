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
    console.error('[Account] disconnect all error:', err.message)
    res.status(500).json({ error: 'An internal error occurred. Please try again.' })
  }
})

// DELETE /api/account/user — schedule account for deletion in 30 days
router.delete('/user', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { confirm } = req.body

    if (confirm !== 'DELETE') {
      return res.status(400).json({ error: 'Must send confirm: "DELETE"' })
    }

    // Schedule deletion in 30 days
    const deletionDate = new Date()
    deletionDate.setDate(deletionDate.getDate() + 30)

    await supabase
      .from('profiles')
      .update({
        deletion_scheduled_at: deletionDate.toISOString(),
        full_name: '[Pending Deletion]',
      })
      .eq('id', userId)

    // Immediately disconnect AWS accounts and revoke API keys for security
    await supabase.from('aws_accounts').delete().eq('user_id', userId)
    await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('user_id', userId)

    // Sign out all sessions
    await supabase.auth.admin.signOut(userId, 'global')

    res.json({
      success: true,
      message: 'Your account is scheduled for deletion in 30 days. Contact support to cancel.',
    })
  } catch (err) {
    console.error('[Account] delete user error:', err.message)
    res.status(500).json({ error: 'An internal error occurred. Please try again.' })
  }
})

export default router
