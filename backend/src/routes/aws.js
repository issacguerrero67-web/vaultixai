import { Router } from 'express'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const client = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' })

// POST /api/aws/verify
// Verifies a customer's IAM role is assumable by attempting STS AssumeRole.
router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const { accountId, roleArn } = req.body

    if (!accountId || !roleArn) {
      return res.status(400).json({ error: 'accountId and roleArn are required.' })
    }

    if (!/^\d{12}$/.test(accountId)) {
      return res.status(400).json({ error: 'accountId must be a 12-digit number.' })
    }

    const command = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: 'VaultixVerify',
      DurationSeconds: 900,
    })

    await client.send(command)

    res.json({ success: true, message: 'Role verified successfully.' })
  } catch (err) {
    // STS throws when the role doesn't exist or trust policy isn't configured
    console.error('STS AssumeRole failed:', err.message)
    res.status(422).json({ error: 'Could not assume role. Make sure the CloudFormation stack deployed successfully.' })
  }
})

export default router
