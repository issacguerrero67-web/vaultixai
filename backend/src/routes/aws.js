import { Router } from 'express'
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const client = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const ARN_REGEX = /^arn:aws:iam::\d{12}:role\/[\w+=,.@/-]{1,64}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// POST /api/aws/verify
// Verifies a customer's IAM role is assumable by attempting STS AssumeRole,
// then persists the account using the service role key.
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { accountId, roleArn, external_id, account_name } = req.body

    if (!accountId || !/^\d{12}$/.test(accountId)) {
      return res.status(400).json({ error: 'accountId must be a 12-digit number.' })
    }

    if (!roleArn || !ARN_REGEX.test(roleArn)) {
      return res.status(400).json({ error: 'Invalid role ARN format.' })
    }

    if (external_id && !UUID_REGEX.test(external_id)) {
      return res.status(400).json({ error: 'Invalid external ID.' })
    }

    if (account_name !== undefined && (typeof account_name !== 'string' || account_name.length > 100)) {
      return res.status(400).json({ error: 'Invalid account name.' })
    }

    const sanitizedName = account_name
      ? account_name.replace(/<[^>]*>/g, '').trim() || 'My AWS Account'
      : 'My AWS Account'

    const command = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: 'VaultixVerify',
      DurationSeconds: 900,
      ...(external_id ? { ExternalId: external_id } : {}),
    })

    await client.send(command)

    const { data: existing } = await supabase
      .from('aws_accounts')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('role_arn', roleArn)
      .limit(1)

    if (!existing || existing.length === 0) {
      const { error } = await supabase.from('aws_accounts').insert({
        user_id: req.user.id,
        account_name: sanitizedName,
        role_arn: roleArn,
        external_id: external_id || randomUUID(),
      })
      if (error) {
        console.error('[AWS] aws_accounts insert failed:', error.message)
      }
    }

    res.json({ success: true, message: 'Role verified successfully.' })
  } catch (err) {
    // STS throws when the role doesn't exist or trust policy isn't configured
    console.error('[AWS] STS AssumeRole failed:', err.message)
    res.status(422).json({ error: 'Could not assume role. Make sure the CloudFormation stack deployed successfully.' })
  }
})

export default router
