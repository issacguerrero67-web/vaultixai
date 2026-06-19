import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function createCheckoutSession(customerId, priceId, userId) {
  // TODO: implement Stripe checkout session creation
}

export async function handleWebhookEvent(payload, sig) {
  // TODO: implement webhook event handling (subscription updates, etc.)
}
