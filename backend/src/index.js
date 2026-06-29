import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'

import healthRouter from './routes/health.js'
import auditRouter from './routes/audit.js'
import awsAccountRouter from './routes/awsAccounts.js'
import awsRoutes from './routes/aws.js'
import reportsRouter from './routes/reports.js'
import stripeRouter from './routes/stripe.js'
import { startCronJobs } from './services/cronJobs.js'

const app = express()
const PORT = process.env.PORT || 3001

// Fix 1 — remove X-Powered-By header
app.disable('x-powered-by')

// Fix 2 — Helmet security headers
app.use(helmet())

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://vaultixai.app'
    : 'http://localhost:5173',
  credentials: true
}))

// Fix 4 — Global rate limiter covering all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})

app.use(globalLimiter)

// Skip express.json() for the Stripe webhook — it needs the raw body for signature verification
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    next()
  } else {
    express.json()(req, res, next)
  }
})

app.use('/health', healthRouter)
app.use('/api/audit', auditRouter)
app.use('/api/aws-accounts', awsAccountRouter)
app.use('/api/aws', awsRoutes)
app.use('/api/reports', reportsRouter)
app.use('/api/stripe', stripeRouter)

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: 'Something went wrong. Please try again.' })
})

app.listen(PORT, () => {
  console.log(`Vaultix AI backend running on port ${PORT}`)
  startCronJobs()
})
