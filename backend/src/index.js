import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import healthRouter from './routes/health.js'
import auditRouter from './routes/audit.js'
import awsAccountRouter from './routes/awsAccounts.js'
import reportsRouter from './routes/reports.js'
import stripeRouter from './routes/stripe.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/health', healthRouter)
app.use('/api/audit', auditRouter)
app.use('/api/aws-accounts', awsAccountRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/stripe', stripeRouter)

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({ error: 'Something went wrong. Please try again.' })
})

app.listen(PORT, () => {
  console.log(`CloudCost AI backend running on port ${PORT}`)
})
