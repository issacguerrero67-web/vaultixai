import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

// GET /api/aws-accounts
router.get('/', async (req, res, next) => {
  try {
    res.json({ accounts: [] }) // placeholder
  } catch (err) {
    next(err)
  }
})

// POST /api/aws-accounts
router.post('/', async (req, res, next) => {
  try {
    res.status(201).json({ account: null }) // placeholder
  } catch (err) {
    next(err)
  }
})

// DELETE /api/aws-accounts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    res.json({ success: true }) // placeholder
  } catch (err) {
    next(err)
  }
})

export default router
