import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/stripe/webhook — no auth, raw body required
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    res.json({ received: true }) // placeholder
  } catch (err) {
    next(err)
  }
})

router.use(requireAuth)

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', async (req, res, next) => {
  try {
    res.json({ url: null }) // placeholder
  } catch (err) {
    next(err)
  }
})

export default router
