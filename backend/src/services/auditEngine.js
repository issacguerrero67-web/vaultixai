import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an expert AWS cost optimization engineer. Analyze the provided AWS account data and identify specific cost optimization opportunities.

Return ONLY a valid JSON array of findings. No preamble, no markdown, no explanation — just the raw JSON array.

Each finding must follow this exact structure:
{
  "id": "unique-slug",
  "severity": "high" | "medium" | "low",
  "category": "EC2" | "RDS" | "S3" | "EBS" | "Network" | "General",
  "title": "Short title of the finding",
  "description": "What the problem is",
  "recommendation": "Specific action to take",
  "estimatedMonthlySavings": number (in USD, 0 if unknown)
}

Focus on:
- Unattached EBS volumes (wasted spend)
- Unused Elastic IPs (charged when not attached)
- EC2 instances with CPU < 5% average (rightsizing candidates)
- Services with high spend and optimization potential
- Any anomalies in cost trends

If the account has no spend or resources, return findings with general best practice recommendations for a new AWS account.`

export async function runAuditEngine(awsData) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
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

  const findings = JSON.parse(cleaned)
  return findings
}
