import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import {
  EC2Client,
  DescribeVolumesCommand,
  CreateSnapshotCommand,
  DeleteVolumeCommand,
  DescribeAddressesCommand,
  ReleaseAddressCommand,
  DescribeInstancesCommand,
  StopInstancesCommand,
  StartInstancesCommand,
  DescribeSnapshotsCommand,
  DeleteSnapshotCommand,
  CreateVolumeCommand,
} from '@aws-sdk/client-ec2'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function assumeAutopilotRole(roleArn, externalId) {
  const sts = new STSClient({ region: 'us-east-1' })
  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: 'VaultixAutopilot',
    ExternalId: externalId,
  })
  const response = await sts.send(command)
  return {
    accessKeyId: response.Credentials.AccessKeyId,
    secretAccessKey: response.Credentials.SecretAccessKey,
    sessionToken: response.Credentials.SessionToken,
  }
}

export async function generateAutopilotActions(userId, awsAccountId) {
  const { data: account } = await supabase
    .from('aws_accounts')
    .select('*')
    .eq('id', awsAccountId)
    .eq('user_id', userId)
    .single()

  if (!account) throw new Error('AWS account not found')

  const { data: report } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('aws_account_id', awsAccountId)
    .eq('user_id', userId)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!report) throw new Error('No completed audit found. Run an audit first.')

  const credentials = await assumeAutopilotRole(
    account.autopilot_role_arn,
    account.external_id
  )

  const ec2 = new EC2Client({ region: 'us-east-1', credentials })

  const actions = []

  // 1. Find unattached EBS volumes
  try {
    const volumes = await ec2.send(new DescribeVolumesCommand({
      Filters: [{ Name: 'status', Values: ['available'] }],
    }))
    for (const vol of volumes.Volumes || []) {
      const sizeGb = vol.Size || 0
      const monthlyCost = sizeGb * 0.10
      actions.push({
        user_id: userId,
        aws_account_id: awsAccountId,
        audit_report_id: report.id,
        action_type: 'delete_ebs_volume',
        resource_id: vol.VolumeId,
        resource_name: vol.Tags?.find(t => t.Key === 'Name')?.Value || vol.VolumeId,
        description: `Delete unattached ${sizeGb}GB ${vol.VolumeType || 'gp2'} volume ${vol.VolumeId}. A snapshot will be created before deletion.`,
        estimated_monthly_savings: monthlyCost,
        risk_level: 'safe',
        is_reversible: true,
        status: 'pending',
      })
    }
  } catch (err) {
    console.error('EBS scan error:', err.message)
  }

  // 2. Find unused Elastic IPs
  try {
    const eips = await ec2.send(new DescribeAddressesCommand({}))
    for (const eip of eips.Addresses || []) {
      if (!eip.AssociationId) {
        actions.push({
          user_id: userId,
          aws_account_id: awsAccountId,
          audit_report_id: report.id,
          action_type: 'release_elastic_ip',
          resource_id: eip.AllocationId,
          resource_name: eip.PublicIp,
          description: `Release unused Elastic IP ${eip.PublicIp} (${eip.AllocationId}). Note: this IP cannot be guaranteed to be reclaimed.`,
          estimated_monthly_savings: 3.65,
          risk_level: 'caution',
          is_reversible: false,
          status: 'pending',
        })
      }
    }
  } catch (err) {
    console.error('EIP scan error:', err.message)
  }

  // 3. Find idle EC2 instances from audit findings
  const idleFindings = (report.findings || []).filter(f =>
    f.category === 'EC2' && f.id.startsWith('ec2-rightsizing')
  )
  for (const finding of idleFindings) {
    const instanceId = finding.id.replace('ec2-rightsizing-', '')
    if (instanceId.startsWith('i-')) {
      actions.push({
        user_id: userId,
        aws_account_id: awsAccountId,
        audit_report_id: report.id,
        action_type: 'stop_ec2_instance',
        resource_id: instanceId,
        resource_name: instanceId,
        description: `Stop idle EC2 instance ${instanceId}. CPU has been under 2% for 14+ days. Instance can be restarted at any time.`,
        estimated_monthly_savings: finding.estimatedMonthlySavings || 0,
        risk_level: 'safe',
        is_reversible: true,
        status: 'pending',
      })
    }
  }

  if (actions.length === 0) {
    return { actions: [], message: 'No automated actions available for this account.' }
  }

  // Delete existing pending actions before inserting new ones
  await supabase
    .from('autopilot_actions')
    .delete()
    .eq('aws_account_id', awsAccountId)
    .eq('user_id', userId)
    .eq('status', 'pending')

  const { data: inserted, error } = await supabase
    .from('autopilot_actions')
    .insert(actions)
    .select()

  if (error) throw new Error('Failed to save actions: ' + error.message)

  return { actions: inserted, message: `Generated ${inserted.length} autopilot actions.` }
}

export async function executeAction(actionId, userId) {
  const { data: action } = await supabase
    .from('autopilot_actions')
    .select('*, aws_accounts(*)')
    .eq('id', actionId)
    .eq('user_id', userId)
    .single()

  if (!action) throw new Error('Action not found')
  if (action.status !== 'approved') throw new Error('Action must be approved before executing')

  await supabase.from('autopilot_actions').update({ status: 'executing' }).eq('id', actionId)

  const credentials = await assumeAutopilotRole(
    action.aws_accounts.autopilot_role_arn,
    action.aws_accounts.external_id
  )

  const ec2 = new EC2Client({ region: 'us-east-1', credentials })

  try {
    let result = {}

    if (action.action_type === 'delete_ebs_volume') {
      const volInfo = await ec2.send(new DescribeVolumesCommand({
        VolumeIds: [action.resource_id],
      }))
      const availabilityZone = volInfo.Volumes?.[0]?.AvailabilityZone || 'us-east-1a'
      result.availability_zone = availabilityZone

      const snapshot = await ec2.send(new CreateSnapshotCommand({
        VolumeId: action.resource_id,
        Description: `Vaultix Autopilot backup before deletion - ${new Date().toISOString()}`,
        TagSpecifications: [{
          ResourceType: 'snapshot',
          Tags: [
            { Key: 'CreatedBy', Value: 'VaultixAutopilot' },
            { Key: 'OriginalVolume', Value: action.resource_id },
          ],
        }],
      }))
      result.snapshot_id = snapshot.SnapshotId
      await new Promise(r => setTimeout(r, 2000))
      await ec2.send(new DeleteVolumeCommand({ VolumeId: action.resource_id }))
      result.deleted = true
    }

    if (action.action_type === 'release_elastic_ip') {
      await ec2.send(new ReleaseAddressCommand({ AllocationId: action.resource_id }))
      result.released = true
    }

    if (action.action_type === 'stop_ec2_instance') {
      await ec2.send(new StopInstancesCommand({ InstanceIds: [action.resource_id] }))
      result.stopped = true
    }

    await supabase.from('autopilot_actions').update({
      status: 'complete',
      executed_at: new Date().toISOString(),
      result,
      snapshot_id: result.snapshot_id || null,
    }).eq('id', actionId)

    await supabase.from('autopilot_log').insert({
      user_id: userId,
      aws_account_id: action.aws_account_id,
      action_id: actionId,
      event_type: 'executed',
      details: result,
    })

    return { success: true, result }
  } catch (err) {
    await supabase.from('autopilot_actions').update({
      status: 'failed',
      error_message: err.message,
    }).eq('id', actionId)

    await supabase.from('autopilot_log').insert({
      user_id: userId,
      aws_account_id: action.aws_account_id,
      action_id: actionId,
      event_type: 'failed',
      details: { error: err.message },
    })

    throw err
  }
}

export async function rollbackAction(actionId, userId) {
  const { data: action } = await supabase
    .from('autopilot_actions')
    .select('*, aws_accounts(*)')
    .eq('id', actionId)
    .eq('user_id', userId)
    .single()

  if (!action) throw new Error('Action not found')
  if (action.status !== 'complete') throw new Error('Only completed actions can be rolled back')
  if (!action.is_reversible) throw new Error('This action cannot be reversed')

  const credentials = await assumeAutopilotRole(
    action.aws_accounts.autopilot_role_arn,
    action.aws_accounts.external_id
  )

  const ec2 = new EC2Client({ region: 'us-east-1', credentials })

  let result = {}

  if (action.action_type === 'delete_ebs_volume') {
    if (!action.snapshot_id) throw new Error('No snapshot available for rollback.')
    const availabilityZone = action.result?.availability_zone || 'us-east-1a'
    const restored = await ec2.send(new CreateVolumeCommand({
      SnapshotId: action.snapshot_id,
      AvailabilityZone: availabilityZone,
      TagSpecifications: [{
        ResourceType: 'volume',
        Tags: [
          { Key: 'CreatedBy', Value: 'VaultixAutopilotRollback' },
          { Key: 'RestoredFromSnapshot', Value: action.snapshot_id },
          { Key: 'OriginalVolume', Value: action.resource_id },
        ],
      }],
    }))
    result.restored_volume_id = restored.VolumeId
  }

  if (action.action_type === 'stop_ec2_instance') {
    await ec2.send(new StartInstancesCommand({ InstanceIds: [action.resource_id] }))
    result.restarted = true
  }

  await supabase.from('autopilot_actions').update({
    status: 'rolled_back',
    result: { ...action.result, rollback: result },
  }).eq('id', actionId)

  await supabase.from('autopilot_log').insert({
    user_id: userId,
    aws_account_id: action.aws_account_id,
    action_id: actionId,
    event_type: 'rolled_back',
    details: result,
  })

  return { success: true, result }
}
