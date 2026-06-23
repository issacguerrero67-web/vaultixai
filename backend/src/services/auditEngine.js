import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an expert AWS cost optimization engineer with deep knowledge of AWS pricing models, Reserved Instances, Savings Plans, and resource rightsizing. Analyze the provided AWS account data and identify specific cost optimization opportunities.

Return ONLY a valid JSON array of findings. No preamble, no markdown, no explanation — just the raw JSON array.

Each finding must follow this exact structure:
{
  "id": "unique-slug",
  "severity": "high" | "medium" | "low",
  "category": "EC2" | "RDS" | "S3" | "EBS" | "Network" | "SavingsPlans" | "General",
  "title": "Short title of the finding",
  "description": "What the problem is and why it costs money",
  "recommendation": "Specific action to take with exact steps",
  "estimatedMonthlySavings": number (in USD, 0 if unknown)
}

Analyze and flag the following:

EC2 RIGHTSIZING:
- Instances with average CPU < 5% are severely underutilized — recommend downsizing 1-2 instance sizes
- Instances with average CPU < 20% are candidates for rightsizing
- Calculate estimated savings based on AWS on-demand pricing differences between instance sizes

SAVINGS PLANS & RESERVED INSTANCES:
- If any EC2 instances are running on On-Demand pricing with no Savings Plan coverage, flag this as HIGH severity
- Compute Savings Plans offer 66% savings vs On-Demand for consistent workloads
- EC2 Instance Savings Plans offer up to 72% savings for specific instance families
- If monthly EC2 spend exceeds $100, a 1-year Savings Plan pays for itself immediately
- Include specific dollar estimates: "Running $X/mo on On-Demand. A 1-year Compute Savings Plan would cost approximately $Y/mo — saving $Z/mo"

EBS VOLUMES:
- Unattached EBS volumes (status: available) are pure waste — flag as HIGH severity
- Calculate exact monthly cost: gp2 costs $0.10/GB/mo, gp3 costs $0.08/GB/mo, io1 costs $0.125/GB/mo
- Recommend snapshot + delete

ELASTIC IPs:
- Unattached Elastic IPs cost $0.005/hr = $3.60/mo each — flag every one as MEDIUM severity

COST TRENDS:
- Flag any month-over-month cost increases > 20% as HIGH severity
- Flag services that appeared in billing for the first time as MEDIUM (unexpected spend)
- Flag the top 3 most expensive services with optimization recommendations

RDS INSTANCES:
- Idle RDS instances (~0 connections, status "available" with no recent activity) — flag as HIGH severity, recommend snapshot + delete
- Single-AZ RDS instances that look like production databases (by naming convention or instance class db.r*/db.m*) — flag as MEDIUM, recommend enabling Multi-AZ for failover
- Unencrypted RDS storage (storageEncrypted: false) — flag as MEDIUM severity, recommend enabling encryption
- Outdated/deprecated engine versions (MySQL < 8.0, PostgreSQL < 14, MariaDB < 10.6) — flag as MEDIUM, recommend upgrading
- Oversized RDS instance classes relative to expected workload — flag as MEDIUM with rightsizing recommendation
- RDS instances that are publicly accessible (publiclyAccessible: true) — flag as HIGH (security + cost risk)

GENERAL BEST PRACTICES (for new/empty accounts):
- Missing billing alerts
- Missing CloudTrail
- Missing Cost Explorer activation
- No resource tagging strategy
- Root account usage (security + cost risk)
- S3 public access not blocked

Always provide specific, actionable recommendations with exact dollar amounts where possible. Be direct and specific — treat the user as a technical engineer who can implement your recommendations immediately.`

export async function runAuditEngine(awsData) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analyze this AWS account data and return cost optimization findings as a JSON array:\n\n${JSON.stringify(awsData, null, 2)}`,
      },
    ],
  })

  const text = response.content[0].text

  // Strip markdown code fences if the model wraps output despite instructions
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  let findings
  try {
    findings = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('JSON parse failed:', parseErr.message)
    console.error('Raw response:', text.substring(0, 500))
    findings = [{
      id: 'parse-error-fallback',
      severity: 'medium',
      category: 'General',
      title: 'Audit completed — please re-run for full results',
      description: 'The audit engine encountered an issue processing the full response. This is usually temporary.',
      recommendation: 'Click Run Audit again to get your full findings.',
      estimatedMonthlySavings: 0,
    }]
  }

  return findings
}
