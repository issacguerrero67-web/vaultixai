import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

// POST /api/audit/run
router.post('/run', async (req, res, next) => {
  try {
    res.json({ reportId: null, status: 'pending' }) // placeholder
  } catch (err) {
    next(err)
  }
})

export default router
