import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

// GET /api/reports
router.get('/', async (req, res, next) => {
  try {
    res.json({ reports: [] }) // placeholder
  } catch (err) {
    next(err)
  }
})

// GET /api/reports/:id
router.get('/:id', async (req, res, next) => {
  try {
    res.json({ report: null }) // placeholder
  } catch (err) {
    next(err)
  }
})

export default router
