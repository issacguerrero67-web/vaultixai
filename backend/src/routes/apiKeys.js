import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../middleware/auth.js'
import crypto from 'crypto'

const router = Router()
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// POST /api/keys/generate
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { name } = req.body
    const rawKey = 'vx_' + crypto.randomBytes(32).toString('hex')
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const keyPreview = rawKey.substring(0, 12) + '...' + rawKey.substring(rawKey.length - 4)

    const { data, error } = await supabase
      .from('api_keys')
      .insert({ user_id: req.user.id, name: name || 'Default', key_hash: keyHash, key_preview: keyPreview })
      .select()
      .single()

    if (error) throw error

    res.json({
      id: data.id,
      key: rawKey,
      preview: keyPreview,
      name: data.name,
      created_at: data.created_at,
      message: 'Save this key now — it will never be shown again.',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/keys
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data } = await supabase
      .from('api_keys')
      .select('id, name, key_preview, created_at, last_used_at, revoked_at')
      .eq('user_id', req.user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })

    res.json({ keys: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/keys/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await supabase
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
