import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Injected into every audit call as the system prompt
const AUDIT_SYSTEM_PROMPT = `You are an AWS cost optimization expert. Analyze the provided AWS account
data and identify cost waste using these patterns: [full prompt in CLAUDE_CONTEXT.md]`

export async function runAudit(awsData) {
  // TODO: build structured payload from awsData, call claude-sonnet-4-6, return parsed JSON
}
