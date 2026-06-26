import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'

import healthRouter from './routes/health.js'
import auditRouter from './routes/audit.js'
import awsAccountRouter from './routes/awsAccounts.js'
import awsRoutes from './routes/aws.js'
import reportsRouter from './routes/reports.js'
import stripeRouter from './routes/stripe.js'
import autopilotRouter from './routes/autopilot.js'
import apiKeysRouter from './routes/apiKeys.js'
import accountRouter from './routes/account.js'
import { startCronJobs } from './services/cronJobs.js'

const app = express()
const PORT = process.env.PORT || 3001

// 100 requests per 15 minutes per IP across all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})

// 10 requests per 15 minutes per IP — expensive AI/AWS routes
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit reached for this endpoint. Please wait before trying again.' },
})

const ALLOWED_ORIGINS = [
  'https://vaultixai.app',
  'https://www.vaultixai.app',
  'http://localhost:5173',
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`))
    }
  },
  credentials: true,
}))

// Skip express.json() for the Stripe webhook — it needs the raw body for signature verification
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    next()
  } else {
    express.json()(req, res, next)
  }
})

app.use(globalLimiter)
app.use('/api/autopilot/chat', strictLimiter)
app.use('/api/audit/run', strictLimiter)

app.use('/health', healthRouter)
app.use('/api/audit', auditRouter)
app.use('/api/aws-accounts', awsAccountRouter)
app.use('/api/aws', awsRoutes)
app.use('/api/reports', reportsRouter)
app.use('/api/stripe', stripeRouter)
app.use('/api/autopilot', autopilotRouter)
app.use('/api/keys', apiKeysRouter)
app.use('/api/account', accountRouter)

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: 'Something went wrong. Please try again.' })
})

app.listen(PORT, () => {
  console.log(`Vaultix AI backend running on port ${PORT}`)
  startCronJobs()
})
