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
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { userId, tier, savingsAmount } = session.metadata

    try {
      await supabase.from('profiles').upsert({
        id: userId,
        stripe_customer_id: session.customer,
        plan: tier, // profiles table uses 'plan', not 'tier'
      })
      console.log('Subscription activated for user:', userId)
    } catch (err) {
      console.error('Failed to update profile after payment:', err.message)
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
// profiles table has: plan (text), stripe_customer_id (text)
// No subscription_status or tier columns yet — map plan → tier, derive status from stripe_customer_id
router.get('/status', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Profile fetch error:', error)
      return res.json({ tier: null, subscriptionStatus: null, stripeCustomerId: null })
    }

    return res.json({
      tier: profile?.tier || profile?.plan || null,
      subscriptionStatus: profile?.subscription_status || (profile?.stripe_customer_id ? 'active' : null),
      stripeCustomerId: profile?.stripe_customer_id || null,
    })
  } catch (err) {
    console.error('Stripe status error:', err.message)
    return res.json({ tier: null, subscriptionStatus: null, stripeCustomerId: null })
  }
})

export default router
