/**
 * Vaultix AI — Demo Account Seeder
 *
 * Run ONCE after applying demo-migration.sql:
 *   cd backend && node scripts/seed-demo.mjs
 *
 * Safe to re-run: all operations are idempotent (upsert / delete+insert).
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in backend/.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── DEMO CONFIG ──────────────────────────────────────────────────────────────

const DEMO_EMAIL    = 'demo@vaultixai.app'
const DEMO_PASSWORD = 'VaultixDemo2025!'   // public — only used for demo login
const DEMO_NAME     = 'Demo Account'
const DEMO_ACCOUNT_NAME    = 'Demo Company AWS'
const DEMO_AWS_ACCOUNT_ID  = '123456789012'
const DEMO_ROLE_ARN        = `arn:aws:iam::${DEMO_AWS_ACCOUNT_ID}:role/DemoRole`

// ── FINDINGS ─────────────────────────────────────────────────────────────────
// 8 realistic findings totalling $4,037.60/mo.
// Designed to look like a mid-size company's production account.

const FINDINGS = [
  {
    id: 'savings-plan-no-coverage',
    severity: 'high',
    category: 'SavingsPlans',
    title: 'No Compute Savings Plan — $4,187/mo running On-Demand',
    description:
      'Your account has $4,187/mo in EC2 On-Demand spend with zero Savings Plan coverage. ' +
      'Every dollar is billed at On-Demand rates — the most expensive AWS pricing tier. ' +
      'Compute Savings Plans offer up to 66% savings vs On-Demand for consistent workloads ' +
      'with no instance-type lock-in.',
    recommendation:
      '1. Go to AWS Cost Explorer → Savings Plans → Purchase Savings Plans.\n' +
      '2. Select Compute Savings Plan with a 1-year, no-upfront commitment.\n' +
      '3. Set the hourly commitment to approximately $3.80/hr to cover your baseline EC2 usage.\n' +
      '4. The plan activates immediately and applies automatically across any instance type, region, or OS.',
    estimatedMonthlySavings: 1675,
    resourceId: 'account-wide',
    resourceArn: null,
  },
  {
    id: 'nat-gateway-idle-us-east-1a',
    severity: 'high',
    category: 'Network',
    title: 'Idle NAT Gateway processing $1,200+/mo in data transfer charges',
    description:
      'NAT Gateway nat-0a3f8c2d1e4b5f789 in us-east-1a processed 18.4 TB of data transfer last month. ' +
      'At $0.045/GB for data processing plus $32.40/mo in hourly charges, this gateway is generating $1,247/mo. ' +
      'CloudWatch shows no outbound connections from the associated private subnet in 22 days, ' +
      'suggesting this gateway is no longer serving active resources.',
    recommendation:
      '1. Open EC2 → NAT Gateways and locate nat-0a3f8c2d1e4b5f789.\n' +
      '2. Check the associated route tables — if no active instances route through this gateway, it can be removed.\n' +
      '3. Delete the NAT Gateway (takes effect immediately).\n' +
      '4. Update route tables to remove the 0.0.0.0/0 route, or replace with a VPC endpoint for S3/DynamoDB access.\n' +
      '5. Release the associated Elastic IP if it is no longer needed.',
    estimatedMonthlySavings: 1247,
    resourceId: 'nat-0a3f8c2d1e4b5f789',
    resourceArn: `arn:aws:ec2:us-east-1:${DEMO_AWS_ACCOUNT_ID}:natgateway/nat-0a3f8c2d1e4b5f789`,
  },
  {
    id: 'ec2-rightsizing-i-0a1b2c3d4e5f67890',
    severity: 'high',
    category: 'EC2',
    title: 'Idle EC2 t3.xlarge running 24/7 at 2.1% average CPU',
    description:
      'Instance i-0a1b2c3d4e5f67890 (Name: web-staging-1) is a t3.xlarge ($0.1664/hr, $121/mo) that has ' +
      'averaged 2.1% CPU utilization over the past 14 days. At this level, a t3.medium handles peak load ' +
      'with significant headroom. CloudWatch patterns suggest this is a staging server that may be running ' +
      'permanently without active use.',
    recommendation:
      '1. Confirm the instance is not serving active traffic: check ALB target group health and CloudWatch RequestCount.\n' +
      '2. If staging/dev: stop the instance and create an AWS Instance Scheduler rule to run only during business hours (Mon–Fri 8am–6pm) — cuts cost by 65%.\n' +
      '3. If it must run 24/7: downsize from t3.xlarge to t3.medium (EC2 console → stop → change instance type → start). Cost drops from $0.1664/hr to $0.0416/hr — 75% reduction.\n' +
      '4. Consider Spot Instances for staging workloads for an additional 70% savings on top of rightsizing.',
    estimatedMonthlySavings: 362,
    resourceId: 'i-0a1b2c3d4e5f67890',
    resourceArn: `arn:aws:ec2:us-east-1:${DEMO_AWS_ACCOUNT_ID}:instance/i-0a1b2c3d4e5f67890`,
  },
  {
    id: 'ebs-unattached-volumes',
    severity: 'high',
    category: 'EBS',
    title: '3 unattached EBS volumes wasting $115/mo',
    description:
      'Three EBS volumes totaling 480 GB are in "available" state and have been accumulating costs since ' +
      'their parent instances were terminated. Unattached volumes are pure waste.\n\n' +
      '• vol-0a1b2c3d4e5f6789 — 200 GB gp2 — $20/mo — detached 47 days ago\n' +
      '• vol-0e5f67890a1b2c3d — 180 GB gp3 — $14.40/mo — detached 31 days ago\n' +
      '• vol-0d4c3b2a1e0f9876 — 100 GB gp2 — $10/mo — detached 89 days ago\n\n' +
      'Total: $44.40/mo in EBS storage plus an estimated $70.60/mo in related orphaned snapshot charges.',
    recommendation:
      '1. Navigate to EC2 → Volumes → filter by status "Available".\n' +
      '2. For each volume: verify the last attachment and whether the data is still needed.\n' +
      '3. Create a final safety snapshot, then delete the volume.\n' +
      '4. If the data must be preserved long-term, keep the snapshot ($0.05/GB/mo) and delete the volume — snapshots cost 50% less than live volumes.\n' +
      '5. CLI shortcut: aws ec2 describe-volumes --filters Name=status,Values=available --query "Volumes[].{ID:VolumeId,Size:Size,Type:VolumeType}"',
    estimatedMonthlySavings: 115,
    resourceId: 'vol-0a1b2c3d4e5f6789',
    resourceArn: `arn:aws:ec2:us-east-1:${DEMO_AWS_ACCOUNT_ID}:volume/vol-0a1b2c3d4e5f6789`,
  },
  {
    id: 'rds-rightsizing-prod-postgres',
    severity: 'medium',
    category: 'RDS',
    title: 'RDS db.r5.2xlarge averaging 3.8% CPU — downsizing saves $418/mo',
    description:
      'RDS instance prod-postgres-main is a Multi-AZ db.r5.2xlarge ($0.960/hr per node, $1,382/mo total) ' +
      'running PostgreSQL 14.9. CloudWatch shows average CPU at 3.8% over 30 days with a peak of 22% during ' +
      'a Tuesday morning batch window. The r5.2xlarge provides 64 GB RAM and 8 vCPUs — significantly ' +
      'overprovisioned. A db.r5.large (16 GB RAM, 2 vCPUs) accommodates current load with 3× headroom at peak.',
    recommendation:
      '1. Review RDS Performance Insights to confirm CPU, memory, and I/O patterns before downsizing.\n' +
      '2. Schedule changes during a low-traffic maintenance window (Multi-AZ resize causes ~5 min of failover downtime).\n' +
      '3. Modify: RDS → Databases → prod-postgres-main → Modify → DB instance class → db.r5.large.\n' +
      '4. Select "Apply during next scheduled maintenance window" to avoid unplanned downtime.\n' +
      '5. Monitor FreeableMemory and CPUUtilization in CloudWatch for 48 hours post-resize.\n' +
      '6. If memory pressure appears (FreeableMemory < 2 GB): scale back to db.r5.xlarge as an intermediate step.',
    estimatedMonthlySavings: 418,
    resourceId: 'prod-postgres-main',
    resourceArn: `arn:aws:rds:us-east-1:${DEMO_AWS_ACCOUNT_ID}:db:prod-postgres-main`,
  },
  {
    id: 'ebs-stale-snapshots',
    severity: 'medium',
    category: 'EBS',
    title: '47 EBS snapshots older than 90 days accumulating $114/mo',
    description:
      'Your account has 47 EBS snapshots totaling 2.3 TB in us-east-1, with the oldest dating back 14 months. ' +
      'At $0.05/GB/mo you are paying $114/mo to retain these past any reasonable recovery window. ' +
      'Most are from terminated instances with no active parent volume. Industry standard is: daily snapshots ' +
      'retained 7 days, weekly retained 4 weeks, monthly retained 3 months — then delete.',
    recommendation:
      '1. Set up AWS Data Lifecycle Manager (DLM) to automate retention going forward: EC2 → Lifecycle Manager → Create snapshot policy.\n' +
      '2. Identify snapshots older than 90 days: aws ec2 describe-snapshots --owner-ids self --query \'Snapshots[?StartTime<=`2025-04-01`].[SnapshotId,StartTime,VolumeSize]\' --output table\n' +
      '3. Before deleting, verify no AMI references the snapshot: deregistered AMIs leave orphaned snapshots.\n' +
      '4. Delete in batches, keeping the most recent snapshot per volume as a safety net.',
    estimatedMonthlySavings: 114,
    resourceId: null,
    resourceArn: null,
  },
  {
    id: 'eip-unassociated-4-addresses',
    severity: 'medium',
    category: 'EC2',
    title: '4 unassociated Elastic IPs — $14.60/mo idle charge',
    description:
      'Four Elastic IP addresses are allocated but not associated with any running instance or network interface. ' +
      'AWS charges $0.005/hr ($3.65/mo) for each idle EIP — these appear to be remnants from terminated instances.\n\n' +
      '• eipalloc-0a1b2c3d4e5f6789 — 54.91.123.45 — idle 38 days\n' +
      '• eipalloc-0f1e2d3c4b5a6987 — 52.201.87.234 — idle 61 days\n' +
      '• eipalloc-0c2b3a4d5e6f7890 — 34.239.45.178 — idle 14 days\n' +
      '• eipalloc-0b9a8c7d6e5f4321 — 54.80.201.99 — idle 22 days',
    recommendation:
      '1. Navigate to EC2 → Elastic IPs in the AWS console.\n' +
      '2. Confirm with your team that each IP has no planned use.\n' +
      '3. Select the EIP → Actions → Release Elastic IP address.\n' +
      '4. Note: once released, that specific IP is returned to AWS\'s pool permanently. Only allocate a new EIP when you have a resource ready to attach it to.',
    estimatedMonthlySavings: 14.60,
    resourceId: 'eipalloc-0a1b2c3d4e5f6789',
    resourceArn: null,
  },
  {
    id: 'cloudwatch-log-retention',
    severity: 'low',
    category: 'General',
    title: '12 CloudWatch Log Groups have no retention policy — $92/mo and growing',
    description:
      'Twelve CloudWatch Log Groups have no retention policy set, meaning logs accumulate indefinitely. ' +
      'These groups currently total 184 GB at $0.50/GB/mo ($92/mo). Without a policy, this cost grows ' +
      'every month as new logs are ingested. Groups include: /aws/lambda/data-processor, ' +
      '/aws/lambda/api-gateway-handler, /ecs/prod-web-service, and 9 others.',
    recommendation:
      '1. Go to CloudWatch → Log Groups → filter by "Never expire" as the retention setting.\n' +
      '2. For each group: select → Actions → Edit retention setting.\n' +
      '3. Recommended retention periods:\n' +
      '   • Lambda execution logs: 14 days\n' +
      '   • Application error logs: 30 days\n' +
      '   • Access/request logs: 90 days\n' +
      '   • Compliance-required logs: 1 year\n' +
      '4. Automate with CLI: aws logs put-retention-policy --log-group-name /aws/lambda/data-processor --retention-in-days 14\n' +
      '5. Use AWS Config to enforce a retention policy rule on all future log groups.',
    estimatedMonthlySavings: 92,
    resourceId: null,
    resourceArn: null,
  },
]

const TOTAL_SAVINGS = FINDINGS.reduce((sum, f) => sum + f.estimatedMonthlySavings, 0)

// ── SEEDER ───────────────────────────────────────────────────────────────────

async function run() {
  console.log('🌱  Vaultix AI — Demo Account Seeder')
  console.log(`    Email:   ${DEMO_EMAIL}`)
  console.log(`    Total:   $${TOTAL_SAVINGS.toFixed(2)}/mo in findings`)
  console.log('')

  // ── 1. Create or find the demo auth user ──────────────────────────────────
  let userId

  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) { console.error('❌  Could not list users:', listErr.message); process.exit(1) }

  const existing = users.find(u => u.email === DEMO_EMAIL)

  if (existing) {
    userId = existing.id
    console.log(`✓  Demo user already exists — ${userId}`)
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DEMO_NAME },
    })
    if (createErr) { console.error('❌  Could not create demo user:', createErr.message); process.exit(1) }
    userId = created.user.id
    console.log(`✓  Created demo user — ${userId}`)
  }

  // ── 2. Upsert profile ─────────────────────────────────────────────────────
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: userId,
    email: DEMO_EMAIL,
    full_name: DEMO_NAME,
    plan: 'standard',
    plan_type: 'standard',
    is_demo_account: true,
    audit_unlocked: true,
    savings_found: TOTAL_SAVINGS,
    fee_paid: 0,
    paid_at: null,
  }, { onConflict: 'id' })

  if (profileErr) {
    if (profileErr.message.includes('is_demo_account')) {
      console.error('❌  Column is_demo_account not found. Run demo-migration.sql in Supabase first, then re-run this script.')
      process.exit(1)
    }
    console.error('❌  Profile upsert failed:', profileErr.message)
    process.exit(1)
  }
  console.log('✓  Profile upserted (is_demo_account=true, audit_unlocked=true)')

  // ── 3. Upsert the demo aws_accounts entry ────────────────────────────────
  // Delete any existing row so we can set exact column values on re-runs.
  const { data: existingAccounts } = await supabase
    .from('aws_accounts')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (existingAccounts?.length) {
    await supabase.from('aws_accounts').delete().eq('id', existingAccounts[0].id)
  }

  const { data: acct, error: acctErr } = await supabase.from('aws_accounts').insert({
    user_id: userId,
    account_name: DEMO_ACCOUNT_NAME,
    role_arn: DEMO_ROLE_ARN,
    external_id: '00000000-demo-0000-0000-000000000000',
  }).select().single()

  if (acctErr) { console.error('❌  aws_accounts insert failed:', acctErr.message); process.exit(1) }
  const awsAccountId = acct.id
  console.log(`✓  aws_accounts row upserted — ${awsAccountId}`)

  // ── 4. Delete any existing audit reports for this account (idempotency) ───
  await supabase
    .from('audit_reports')
    .delete()
    .eq('user_id', userId)
    .eq('aws_account_id', awsAccountId)

  // ── 5. Insert the demo audit report ──────────────────────────────────────
  const { data: report, error: reportErr } = await supabase.from('audit_reports').insert({
    user_id: userId,
    aws_account_id: awsAccountId,
    findings: FINDINGS,
    status: 'complete',
    total_savings: TOTAL_SAVINGS,
    // Backdate slightly so it doesn't look like it was just seeded
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  }).select().single()

  if (reportErr) { console.error('❌  audit_reports insert failed:', reportErr.message); process.exit(1) }
  console.log(`✓  Inserted audit report — ${report.id}`)
  console.log(`   ${FINDINGS.length} findings · $${TOTAL_SAVINGS.toFixed(2)}/mo total savings`)

  // ── 6. Summary ────────────────────────────────────────────────────────────
  console.log('')
  console.log('✅  Demo account seeded successfully.')
  console.log('')
  console.log('   Login at: https://vaultixai.app/login')
  console.log(`   Email:    ${DEMO_EMAIL}`)
  console.log(`   Password: ${DEMO_PASSWORD}`)
  console.log('')
  console.log('   Findings breakdown:')
  for (const f of FINDINGS) {
    const sev = f.severity.toUpperCase().padEnd(6)
    const savings = `$${f.estimatedMonthlySavings.toFixed(2)}/mo`.padStart(11)
    console.log(`   [${sev}] ${savings}  ${f.title}`)
  }
  console.log(`   ${''.padEnd(6)}  ${'─'.repeat(11)}`)
  console.log(`   ${'TOTAL'.padEnd(8)}  ${`$${TOTAL_SAVINGS.toFixed(2)}/mo`.padStart(11)}`)
}

run().catch(err => {
  console.error('❌  Unexpected error:', err.message)
  process.exit(1)
})
