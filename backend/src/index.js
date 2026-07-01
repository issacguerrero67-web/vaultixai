import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import Redis from 'ioredis'

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

// Fix 1 — remove X-Powered-By header
app.disable('x-powered-by')

// Fix 2 — Helmet security headers (CSP, HSTS, X-DNS-Prefetch-Control, etc.)
app.use(helmet())

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
})

redis.on('error', (err) => {
  // Log but don't crash — limiters fall back to in-memory if Redis is down
  console.error('[Redis] Connection error:', err.message)
})

function makeStore(prefix) {
  return new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: `rl:${prefix}:`,
  })
}

// passOnStoreError: true — if Redis is unavailable, fail-open rather than crashing every request
// Fix 4 — Global rate limiter covering all routes (100 req / 15 min per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('global'),
  passOnStoreError: true,
  message: { error: 'Too many requests. Please try again later.' },
})

// 10 requests per 15 minutes per IP — expensive AI/AWS routes
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('strict'),
  passOnStoreError: true,
  message: { error: 'Rate limit reached for this endpoint. Please wait before trying again.' },
})

// AWS connection attempts — prevent role scanning
const awsConnectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('aws-connect'),
  passOnStoreError: true,
  message: { error: 'Too many AWS connection attempts.' },
})

// Destructive account operations
const destructiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('destructive'),
  passOnStoreError: true,
  message: { error: 'Too many requests on this endpoint.' },
})

// API key generation — prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('auth'),
  passOnStoreError: true,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
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

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})

// Skip express.json() for the Stripe webhook — it needs the raw body for signature verification
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    next()
  } else {
    express.json({ limit: '10kb' })(req, res, next)
  }
})
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

app.use(globalLimiter)
app.use('/api/autopilot/chat', strictLimiter)
app.use('/api/autopilot/execute', destructiveLimiter)
app.use('/api/autopilot/approve-all', destructiveLimiter)
app.use('/api/audit/run', strictLimiter)
app.use('/api/aws/verify', awsConnectLimiter)
app.use('/api/account/user', destructiveLimiter)
app.use('/api/account/aws-accounts', destructiveLimiter)
app.use('/api/keys/generate', authLimiter)

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
  console.error('[Global Error Handler]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  })
  if (res.headersSent) return next(err)
  res.status(err.status || 500).json({ error: 'An unexpected error occurred. Please try again.' })
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', {
    reason: reason?.message || reason,
    timestamp: new Date().toISOString(),
  })
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  })
  setTimeout(() => process.exit(1), 1000)
})

app.listen(PORT, () => {
  console.log(`Vaultix AI backend running on port ${PORT}`)
  startCronJobs()
})
