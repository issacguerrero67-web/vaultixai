import express, { Router } from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../middleware/auth.js'
import { sendWelcomeEmail, sendPaymentConfirmationEmail, sendCancellationEmail } from '../services/emailService.js'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const TIER_RATES = { standard: 0.20, team: 0.15 }

// POST /api/stripe/webhook — raw body, no auth
// NOTE: Stripe dashboard webhook must have these events enabled:
//   checkout.session.completed
//   customer.subscription.deleted
//   customer.subscription.updated
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message)
    return res.status(400).send('Webhook signature verification failed')
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    const { userId, tier } = session.metadata

    try {
      // Idempotency check — skip if this event was already processed
      const { data: existingEvent } = await supabase
        .from('processed_stripe_events')
        .select('id')
        .eq('event_id', event.id)
        .single()

      if (existingEvent) {
        return res.json({ received: true })
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          plan: tier,
          stripe_customer_id: session.customer,
          subscription_status: 'active',
        })
        .eq('id', userId)

      if (updateError) {
        console.error('[Stripe] Profile update failed:', updateError.message)
      }

      // Mark event as processed
      await supabase
        .from('processed_stripe_events')
        .insert({ event_id: event.id, processed_at: new Date().toISOString() })

      console.log('[Stripe] Subscription activated for user:', userId)

      // Send welcome + payment confirmation emails
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single()

        const userEmail = session.customer_email || session.customer_details?.email
        const fullName = profile?.full_name || null
        const savingsRate = tier === 'team' ? 15 : 20

        await sendWelcomeEmail(userEmail, fullName, tier)
        await sendPaymentConfirmationEmail(userEmail, fullName, tier, savingsRate)
      } catch (emailErr) {
        console.error('[Stripe] Failed to send post-checkout emails:', emailErr.message)
      }
    } catch (err) {
      console.error('[Stripe] Failed to update profile after payment:', err.message)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const customerId = subscription.customer

    console.log('[Stripe] customer.subscription.deleted for customer:', customerId)

    try {
      const { data: profile, error: lookupError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('stripe_customer_id', customerId)
        .single()

      if (lookupError || !profile) {
        console.error('[Stripe] Could not find profile for customer:', customerId, lookupError?.message)
      } else {
        await supabase
          .from('profiles')
          .update({ plan: 'free', subscription_status: 'cancelled' })
          .eq('id', profile.id)

        console.log('[Stripe] Subscription cancelled — downgraded user:', profile.id)

        try {
          const customer = await stripe.customers.retrieve(customerId)
          const userEmail = customer.email
          await sendCancellationEmail(userEmail, profile.full_name)
        } catch (emailErr) {
          console.error('[Stripe] Failed to send cancellation email:', emailErr.message)
        }
      }
    } catch (err) {
      console.error('[Stripe] Failed to handle subscription.deleted:', err.message)
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object
    const customerId = subscription.customer
    const status = subscription.status

    console.log('[Stripe] customer.subscription.updated — customer:', customerId, 'status:', status)

    try {
      const { data: profile, error: lookupError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('stripe_customer_id', customerId)
        .single()

      if (lookupError || !profile) {
        console.error('[Stripe] Could not find profile for customer:', customerId, lookupError?.message)
      } else if (status === 'canceled' || status === 'unpaid') {
        await supabase
          .from('profiles')
          .update({ plan: 'free', subscription_status: 'cancelled' })
          .eq('id', profile.id)

        console.log('[Stripe] Subscription updated to cancelled/unpaid — downgraded user:', profile.id)

        try {
          const customer = await stripe.customers.retrieve(customerId)
          await sendCancellationEmail(customer.email, profile.full_name)
        } catch (emailErr) {
          console.error('[Stripe] Failed to send cancellation email:', emailErr.message)
        }
      } else if (status === 'active') {
        await supabase
          .from('profiles')
          .update({ subscription_status: 'active' })
          .eq('id', profile.id)

        console.log('[Stripe] Subscription reactivated for user:', profile.id)
      }
    } catch (err) {
      console.error('[Stripe] Failed to handle subscription.updated:', err.message)
    }
  }

  res.json({ received: true })
})

router.use(requireAuth)

// POST /api/stripe/create-checkout
router.post('/create-checkout', async (req, res, next) => {
  try {
    const { tier } = req.body

    if (!tier || !TIER_RATES[tier]) {
      return res.status(400).json({ error: 'A valid tier (standard or team) is required.' })
    }

    const rate = TIER_RATES[tier]
    const percentage = rate * 100
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            recurring: { interval: 'month' },
            unit_amount: 0,
            product_data: {
              name: `Vaultix AI - ${tierLabel} Plan`,
              description: `Cloud cost optimization — ${percentage}% of verified monthly savings`,
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
      },
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('[Stripe] create-checkout error:', err.message)
    next(err)
  }
})

// GET /api/stripe/status
router.get('/status', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[Stripe] Profile fetch error:', error.message)
      return res.json({ tier: null, subscriptionStatus: null, stripeCustomerId: null })
    }

    return res.json({
      tier: profile?.tier || profile?.plan || null,
      subscriptionStatus: profile?.subscription_status || (profile?.stripe_customer_id ? 'active' : null),
      stripeCustomerId: profile?.stripe_customer_id || null,
    })
  } catch (err) {
    console.error('[Stripe] status error:', err.message)
    return res.json({ tier: null, subscriptionStatus: null, stripeCustomerId: null })
  }
})

// GET /api/stripe/invoices
router.get('/invoices', async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, plan')
      .eq('id', req.user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return res.json({ invoices: [], hasSubscription: false })
    }

    const invoices = await stripe.invoices.list({
      customer: profile.stripe_customer_id,
      limit: 24,
      expand: ['data.subscription'],
    })

    let subscription = null
    try {
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'active',
        limit: 1,
      })
      subscription = subs.data[0] || null
    } catch (e) {}

    res.json({
      invoices: invoices.data,
      subscription,
      hasSubscription: !!subscription,
      plan: profile.plan,
    })
  } catch (err) {
    console.error('[Stripe] invoices error:', err.message)
    res.status(500).json({ error: 'An internal error occurred. Please try again.' })
  }
})

// GET /api/stripe/savings-summary
router.get('/savings-summary', async (req, res) => {
  try {
    const userId = req.user.id

    const { data: reports } = await supabase
      .from('audit_reports')
      .select('total_savings, created_at, aws_account_id')
      .eq('user_id', userId)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(12)

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, plan')
      .eq('id', userId)
      .single()

    const totalSavingsFound = reports?.reduce((sum, r) => sum + (r.total_savings || 0), 0) || 0
    const latestSavings = reports?.[0]?.total_savings || 0
    const rate = profile?.plan === 'team' ? 0.15 : 0.20
    const latestFee = latestSavings * rate
    const netSavings = latestSavings - latestFee
    const roi = latestFee > 0 ? (latestSavings / latestFee).toFixed(1) : null

    let totalPaid = 0
    if (profile?.stripe_customer_id) {
      try {
        const invoices = await stripe.invoices.list({
          customer: profile.stripe_customer_id,
          status: 'paid',
          limit: 100,
        })
        totalPaid = invoices.data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) / 100
      } catch (e) {}
    }

    res.json({
      latestSavings,
      latestFee,
      netSavings,
      roi,
      totalSavingsFound,
      totalPaid,
      rate,
      plan: profile?.plan,
      reportCount: reports?.length || 0,
    })
  } catch (err) {
    console.error('[Stripe] savings-summary error:', err.message)
    res.status(500).json({ error: 'An internal error occurred. Please try again.' })
  }
})

export default router
