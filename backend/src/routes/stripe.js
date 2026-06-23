import express, { Router } from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TIER_RATES = { standard: 0.20, team: 0.15 }

// POST /api/stripe/webhook — raw body, no auth
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Invalid webhook signature.' })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { userId, tier, savingsAmount } = session.metadata

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        stripe_customer_id: session.customer,
        tier,
        subscription_status: 'active',
      })

    if (error) {
      console.error('Failed to update profile after checkout:', error.message)
    } else {
      console.log(`Subscription activated: user=${userId} tier=${tier} savings=$${savingsAmount}/mo`)
    }
  }

  res.json({ received: true })
})

router.use(requireAuth)

// POST /api/stripe/create-checkout
router.post('/create-checkout', async (req, res, next) => {
  try {
    const { savingsAmount, tier } = req.body

    if (!savingsAmount || !tier || !TIER_RATES[tier]) {
      return res.status(400).json({ error: 'savingsAmount and a valid tier (standard or team) are required.' })
    }

    const rate = TIER_RATES[tier]
    const feeUsd = savingsAmount * rate
    const feeCents = Math.round(feeUsd * 100)
    const percentage = rate * 100

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            recurring: { interval: 'month' },
            unit_amount: feeCents,
            product_data: {
              name: `Vaultix AI - ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
              description: `AWS cost optimization - ${percentage}% of $${savingsAmount}/mo verified savings`,
            },
          },
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/dashboard/reports?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/reports?payment=cancelled`,
      customer_email: req.user.email,
      metadata: {
        userId: req.user.id,
        tier,
        savingsAmount: String(savingsAmount),
      },
    })

    res.json({ url: session.url })
  } catch (err) {
    next(err)
  }
})

// GET /api/stripe/status
router.get('/status', async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('tier, subscription_status, stripe_customer_id')
      .eq('id', req.user.id)
      .single()

    if (error && error.code !== 'PGRST116') return next(error)

    res.json({
      tier: profile?.tier ?? null,
      subscriptionStatus: profile?.subscription_status ?? null,
      stripeCustomerId: profile?.stripe_customer_id ?? null,
    })
  } catch (err) {
    next(err)
  }
})

export default router
