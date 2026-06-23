import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../middleware/auth.js'
import { fetchAwsData } from '../services/awsFetcher.js'

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

    const { role_arn, external_id } = accounts[0]

    const awsData = await fetchAwsData(role_arn, external_id)

    res.json({ success: true, data: awsData })
  } catch (err) {
    next(err)
  }
})

export default router
