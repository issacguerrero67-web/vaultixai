import express, { Router } from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../middleware/auth.js'
import { sendPaymentConfirmationEmail } from '../services/emailService.js'

const router = Router()

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('[Stripe] STRIPE_SECRET_KEY is not set — Stripe routes will return 503')
}
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// POST /api/stripe/webhook — raw body, no auth
// Stripe dashboard must have these events enabled:
//   payment_intent.succeeded
//   payment_intent.payment_failed
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment service not configured.' })
  }

  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message)
    return res.status(400).send('Webhook signature verification failed')
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object
    const { user_id, audit_id, savings_found, plan_type } = intent.metadata || {}

    if (!user_id) {
      console.error('[Stripe] payment_intent.succeeded missing user_id in metadata:', intent.id)
      return res.json({ received: true })
    }

    try {
      // Idempotency check
      const { data: existingEvent } = await supabase
        .from('processed_stripe_events')
        .select('id')
        .eq('event_id', event.id)
        .single()

      if (existingEvent) {
        return res.json({ received: true })
      }

      const feePaid = intent.amount / 100
      const savingsAmount = parseFloat(savings_found) || 0

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          audit_unlocked: true,
          paid_at: new Date().toISOString(),
          savings_found: savingsAmount,
          fee_paid: feePaid,
          plan_type: plan_type || 'standard',
        })
        .eq('id', user_id)

      if (updateError) {
        console.error('[Stripe] Profile update failed:', updateError.message)
      }

      await supabase
        .from('processed_stripe_events')
        .insert({ event_id: event.id, processed_at: new Date().toISOString() })

      console.log('[Stripe] Audit unlocked for user:', user_id, '— fee:', feePaid, '— savings:', savingsAmount)

      // Send payment confirmation email
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user_id)
          .single()

        const userEmail = intent.receipt_email
        if (userEmail) {
          const savingsRate = plan_type === 'team' ? 15 : 20
          await sendPaymentConfirmationEmail(userEmail, profile?.full_name || null, plan_type || 'standard', savingsRate)
        }
      } catch (emailErr) {
        console.error('[Stripe] Failed to send payment confirmation email:', emailErr.message)
      }
    } catch (err) {
      console.error('[Stripe] Failed to process payment_intent.succeeded:', err.message)
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object
    console.error('[Stripe] Payment failed:', intent.id, intent.last_payment_error?.message)
  }

  res.json({ received: true })
})

router.use(requireAuth)

// POST /api/stripe/create-payment-intent
router.post('/create-payment-intent', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment service is not configured. Please contact support.' })
  }

  const userId = req.user.id
  const { audit_id, plan_type: requestedPlanType } = req.body

  // Load profile
  let profile
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('plan_type, audit_unlocked, paid_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Stripe] Profile lookup failed:', error.message)
      return res.status(502).json({ error: 'Unable to load account. Please try again.' })
    }
    profile = data
  } catch (err) {
    console.error('[Stripe] Profile check error:', err.message)
    return res.status(502).json({ error: 'Unable to load account. Please try again.' })
  }

  // Load the audit report
  let report
  try {
    if (audit_id) {
      const { data } = await supabase
        .from('audit_reports')
        .select('id, total_savings, aws_account_id')
        .eq('id', audit_id)
        .eq('user_id', userId)
        .single()
      report = data
    } else {
      const { data } = await supabase
        .from('audit_reports')
        .select('id, total_savings, aws_account_id')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      report = data
    }
  } catch (err) {
    console.error('[Stripe] Audit report fetch error:', err.message)
    return res.status(502).json({ error: 'Unable to load audit data. Please try again.' })
  }

  if (!report) {
    return res.status(404).json({ error: 'No completed audit found. Run an audit first.' })
  }

  const totalSavings = report.total_savings || 0

  // No waste found — no charge
  if (totalSavings === 0) {
    return res.json({ amount: 0, message: 'no_waste_found', savings_found: 0 })
  }

  const planType = requestedPlanType || profile?.plan_type || 'standard'
  const rate = planType === 'team' ? 0.15 : 0.20
  let fee = totalSavings * rate
  if (fee < 19) fee = 19
  const amountCents = Math.round(fee * 100)

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      receipt_email: req.user.email,
      description: `Vaultix AI — AWS Cost Audit unlock ($${totalSavings.toLocaleString()} savings found, ${planType} rate)`,
      metadata: {
        user_id: userId,
        audit_id: report.id,
        savings_found: String(totalSavings),
        plan_type: planType,
      },
    })

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: fee,
      amount_cents: amountCents,
      savings_found: totalSavings,
      rate,
      plan_type: planType,
    })
  } catch (err) {
    console.error('[Stripe] create-payment-intent error:', err.type, err.message)
    if (err.type === 'StripeAuthenticationError') {
      return res.status(503).json({ error: 'Payment service temporarily unavailable. Please try again later.' })
    }
    if (err.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Invalid payment configuration. Please contact support.' })
    }
    return res.status(502).json({ error: 'Unable to create payment. Please try again.' })
  }
})

// GET /api/stripe/status — returns audit unlock state and payment info
router.get('/status', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('audit_unlocked, savings_found, fee_paid, paid_at, plan_type, plan')
      .eq('id', req.user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[Stripe] Profile fetch error:', error.message)
      return res.json({ audit_unlocked: false, savings_found: 0, fee_paid: 0, paid_at: null, plan_type: 'standard' })
    }

    return res.json({
      audit_unlocked: profile?.audit_unlocked ?? false,
      savings_found: profile?.savings_found ?? 0,
      fee_paid: profile?.fee_paid ?? 0,
      paid_at: profile?.paid_at ?? null,
      plan_type: profile?.plan_type ?? profile?.plan ?? 'standard',
    })
  } catch (err) {
    console.error('[Stripe] status error:', err.message)
    return res.json({ audit_unlocked: false, savings_found: 0, fee_paid: 0, paid_at: null, plan_type: 'standard' })
  }
})

// GET /api/stripe/payment-history — list of payment intents for this user
router.get('/payment-history', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('audit_unlocked, savings_found, fee_paid, paid_at, plan_type')
      .eq('id', req.user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.json({ payments: [] })
    }

    const payments = []
    if (profile?.audit_unlocked && profile?.paid_at) {
      payments.push({
        date: profile.paid_at,
        description: 'AWS Cost Audit — full findings unlock',
        amount: profile.fee_paid || 0,
        savings_found: profile.savings_found || 0,
        status: 'paid',
        plan_type: profile.plan_type || 'standard',
      })
    }

    res.json({ payments })
  } catch (err) {
    console.error('[Stripe] payment-history error:', err.message)
    res.json({ payments: [] })
  }
})

// GET /api/stripe/savings-summary
router.get('/savings-summary', async (req, res) => {
  try {
    const userId = req.user.id

    const [{ data: reports }, { data: profile }] = await Promise.all([
      supabase
        .from('audit_reports')
        .select('total_savings, created_at, aws_account_id')
        .eq('user_id', userId)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('profiles')
        .select('plan_type, fee_paid, audit_unlocked')
        .eq('id', userId)
        .single(),
    ])

    const latestSavings = reports?.[0]?.total_savings || 0
    const planType = profile?.plan_type || 'standard'
    const rate = planType === 'team' ? 0.15 : 0.20
    let latestFee = latestSavings * rate
    if (latestSavings > 0 && latestFee < 19) latestFee = 19
    const netSavings = latestSavings - latestFee
    const roi = latestFee > 0 ? (latestSavings / latestFee).toFixed(1) : null

    res.json({
      latestSavings,
      latestFee,
      netSavings,
      roi,
      totalSavingsFound: reports?.reduce((s, r) => s + (r.total_savings || 0), 0) || 0,
      totalPaid: profile?.fee_paid || 0,
      rate,
      plan_type: planType,
      reportCount: reports?.length || 0,
      audit_unlocked: profile?.audit_unlocked ?? false,
    })
  } catch (err) {
    console.error('[Stripe] savings-summary error:', err.message)
    res.status(500).json({ error: 'An internal error occurred. Please try again.' })
  }
})

export default router
