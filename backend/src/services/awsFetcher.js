import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts'
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer'
import { EC2Client, DescribeInstancesCommand, DescribeVolumesCommand, DescribeAddressesCommand } from '@aws-sdk/client-ec2'
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds'

const stsClient = new STSClient({ region: process.env.AWS_REGION || 'us-east-1' })

function toYMD(date) {
  return date.toISOString().split('T')[0]
}

function credentialsFrom(assumed) {
  return {
    accessKeyId: assumed.Credentials.AccessKeyId,
    secretAccessKey: assumed.Credentials.SecretAccessKey,
    sessionToken: assumed.Credentials.SessionToken,
  }
}

export async function fetchAwsData(roleArn, externalId) {
  // ── 1. Assume the customer's role ──────────────────────────────────────────
  const assumeCmd = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: 'VaultixAudit',
    DurationSeconds: 3600,
    ...(externalId ? { ExternalId: externalId } : {}),
  })
  const assumed = await stsClient.send(assumeCmd)
  const credentials = credentialsFrom(assumed)

  // ── 2. Build service clients with temporary credentials ────────────────────
  const region = process.env.AWS_REGION || 'us-east-1'

  // Cost Explorer is global (us-east-1 only)
  const ceClient = new CostExplorerClient({ region: 'us-east-1', credentials })
  const ec2Client = new EC2Client({ region, credentials })
  const cwClient = new CloudWatchClient({ region, credentials })
  const rdsClient = new RDSClient({ region, credentials })

  // ── 3. Cost Explorer — last 90 days by service, monthly ───────────────────
  let costExplorerData = { resultsByTime: [] }
  try {
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - 90)

    const ceResponse = await ceClient.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: toYMD(start), End: toYMD(now) },
      Granularity: 'MONTHLY',
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
      Metrics: ['BlendedCost'],
    }))
    costExplorerData = { resultsByTime: ceResponse.ResultsByTime ?? [] }
  } catch (err) {
    console.warn('Cost Explorer unavailable:', err.message)
  }

  // ── 4–6. EC2 — instances, unattached volumes, Elastic IPs ─────────────────
  let ec2Data = { instances: [], unattachedVolumes: [], elasticIPs: [] }
  try {
    const instancesResp = await ec2Client.send(new DescribeInstancesCommand({}))
    const instances = instancesResp.Reservations?.flatMap(r => r.Instances ?? []) ?? []

    const volumesResp = await ec2Client.send(new DescribeVolumesCommand({
      Filters: [{ Name: 'status', Values: ['available'] }],
    }))
    const unattachedVolumes = volumesResp.Volumes ?? []

    const eipsResp = await ec2Client.send(new DescribeAddressesCommand({}))
    const elasticIPs = eipsResp.Addresses ?? []

    ec2Data = { instances, unattachedVolumes, elasticIPs }
  } catch (err) {
    console.warn('EC2 fetch failed:', err.message)
  }

  // ── 7. CloudWatch — avg CPU per instance, last 14 days ────────────────────
  let cloudwatchData = { cpuUtilization: {} }
  try {
    const cpuUtilization = {}
    const cwEnd = new Date()
    const cwStart = new Date(cwEnd)
    cwStart.setDate(cwStart.getDate() - 14)

    await Promise.all(
      ec2Data.instances.map(async (instance) => {
        const id = instance.InstanceId
        if (!id) return
        try {
          const resp = await cwClient.send(new GetMetricStatisticsCommand({
            Namespace: 'AWS/EC2',
            MetricName: 'CPUUtilization',
            Dimensions: [{ Name: 'InstanceId', Value: id }],
            StartTime: cwStart,
            EndTime: cwEnd,
            Period: 86400,
            Statistics: ['Average'],
          }))
          const datapoints = resp.Datapoints ?? []
          if (datapoints.length === 0) {
            cpuUtilization[id] = null
          } else {
            const sum = datapoints.reduce((acc, dp) => acc + (dp.Average ?? 0), 0)
            cpuUtilization[id] = Math.round((sum / datapoints.length) * 100) / 100
          }
        } catch {
          cpuUtilization[id] = null
        }
      })
    )
    cloudwatchData = { cpuUtilization }
  } catch (err) {
    console.warn('CloudWatch fetch failed:', err.message)
  }

  // ── 8. RDS — DB instances ─────────────────────────────────────────────────
  let rdsData = { instances: [] }
  try {
    const rdsResp = await rdsClient.send(new DescribeDBInstancesCommand({}))
    rdsData = {
      instances: (rdsResp.DBInstances ?? []).map(db => ({
        id: db.DBInstanceIdentifier,
        engine: db.Engine,
        engineVersion: db.EngineVersion,
        instanceClass: db.DBInstanceClass,
        multiAZ: db.MultiAZ,
        storageEncrypted: db.StorageEncrypted,
        status: db.DBInstanceStatus,
        allocatedStorage: db.AllocatedStorage,
        publiclyAccessible: db.PubliclyAccessible,
      })),
    }
  } catch (err) {
    console.warn('RDS fetch failed:', err.message)
  }

  return {
    costExplorer: costExplorerData,
    ec2: ec2Data,
    cloudwatch: cloudwatchData,
    rds: rdsData,
  }
}
