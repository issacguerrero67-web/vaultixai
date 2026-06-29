# Vaultix AI

**AI-powered cloud cost optimization SaaS.** Connects to your AWS account, runs an AI audit, and finds waste across compute, storage, and networking. You only pay when we find real savings.

🔗 **Live at [vaultixai.app](https://vaultixai.app)**

---

## What it does

- **AI Cost Audit** — Connects via read-only IAM role, scans EC2, EBS, EIP, RDS, S3, and Cost Explorer, and surfaces prioritized findings with estimated monthly savings
- **Autopilot** — AI chat powered by Claude that answers questions about your findings and can execute fixes automatically (with pre-deletion snapshots for rollback)
- **Real-time Dashboard** — Live stat cards, findings table with severity badges, savings by category chart, and account switcher
- **Report History** — Full audit history with collapsible finding cards and export
- **Webhooks** — POST to your endpoint on audit completion for Slack or custom integrations
- **Success-based pricing** — 20% Standard / 15% Team of verified monthly savings. No savings = no charge.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite → Vercel |
| Backend | Node.js + Express → Railway |
| Database | Supabase (PostgreSQL + Auth) |
| AI | Anthropic API (claude-sonnet-4-6) |
| Payments | Stripe (live mode) |
| Email | Resend |
| Infrastructure | AWS (IAM, STS AssumeRole, Cost Explorer, EC2, EBS, S3) |

---

## Architecture

Customer AWS Account
↓ (read-only IAM role via STS AssumeRole)
Vaultix Backend (Railway)
↓ (findings JSON)
Anthropic API (AI audit engine)
↓ (structured findings)
Supabase (PostgreSQL)
↓
React Dashboard (Vercel)

---

## Security

- Read-only AWS access by default — we never touch infrastructure without explicit approval
- Autopilot uses a separate write-access role deployed by the customer
- Pre-deletion snapshots before any resource removal
- API keys hashed SHA-256
- Row-level security on all Supabase tables
- CORS locked to vaultixai.app
- Rate limiting on all routes
- Stripe webhook idempotency

---

## Features

- ✅ Full auth (signup, login, password reset)
- ✅ One-click CloudFormation deployment for IAM role
- ✅ Multi-account support with account switcher
- ✅ AI audit engine with 50+ cost patterns
- ✅ Autopilot AI chat with findings context
- ✅ Automated fix execution (EBS delete, EIP release, EC2 stop)
- ✅ Pre-deletion snapshots + rollback
- ✅ Stripe live mode with success-based pricing
- ✅ Branded transactional emails via Resend
- ✅ Webhook support for Slack/custom integrations
- ✅ Monthly re-scans via cron job
- ✅ Feature gating (free vs paid)
- ✅ Mobile responsive with bottom tab nav
- ✅ Azure support coming soon

---

## Local Development

### Prerequisites
- Node.js 18+
- Supabase account
- AWS account with Cost Explorer enabled
- Stripe account
- Anthropic API key
- Resend account

### Frontend
cd frontend
npm install
npm run dev

### Backend
cd backend
npm install
cp .env.example .env
npm run dev

### Environment Variables

Backend (.env):
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-2
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STANDARD_PRICE_ID=
STRIPE_TEAM_PRICE_ID=
RESEND_API_KEY=
FRONTEND_URL=http://localhost:5173

Frontend (.env.local):
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3000

---

## Pricing

| Plan | Fee | Accounts | Features |
|---|---|---|---|
| Free | $0 | 1 | Audit + findings report |
| Standard | 20% of savings | 3 | + Autopilot, email reports, monthly re-scans |
| Team | 15% of savings | Unlimited | + Slack alerts, priority support, QBR |

---

## Built by

Issac Guerrero — Cloud Infrastructure Engineer
vaultixai.app · hello@vaultixai.app

---

Vaultix AI is a live production SaaS. All features described above are fully implemented and working.
