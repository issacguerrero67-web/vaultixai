# CloudCost AI — Claude Code Context Document

# Paste this at the start of EVERY Claude Code session.

# Last updated: June 2026

---

## What we are building

CloudCost AI is a SaaS web application that connects to a customer's AWS

account (read-only), automatically audits their cloud costs using AI, and

delivers a prioritized findings report with a 90-day action plan.

Think: "AWS Cost Explorer, but it tells you exactly what to fix and why."

---

## Founder context

- Issac Guerrero — junior infrastructure engineer, daily AWS experience

- Works with: multi-account AWS, IAM, SSM, Terraform, Docker, VPCs

- AWS Cloud Practitioner certified, pursuing Solutions Architect

- This project was born from the Cloud Cost Toolkit (open source):

  github.com/issacguerrero67-web/cloud-cost-toolkit

---

## Tech stack (do not deviate without asking)

FRONTEND

- React 18 + Vite

- Tailwind CSS

- React Router v6 for navigation

- Axios for API calls

- Hosted on Vercel

BACKEND

- Node.js + Express

- Hosted on Railway

- REST API (not GraphQL)

DATABASE + AUTH

- Supabase (PostgreSQL)

- Supabase Auth (email/password to start)

- Use Supabase JS client on frontend

- Use Supabase admin client on backend

AWS INTEGRATION

- AWS SDK for JavaScript v3

- Read-only IAM role (customer creates in their account, we assume the role)

- Services we query: Cost Explorer, EC2, CloudWatch, RDS, S3, Trusted Advisor

AI LAYER

- Anthropic API

- Model: claude-sonnet-4-6

- Max tokens: 4096 per audit call

- The toolkit context (below) is injected as system prompt

PAYMENTS

- Stripe

- Products: Free tier, Pro ($49/mo), Team ($99/mo)

EMAIL

- Resend API

- Transactional only (report delivery, welcome, alerts)

---

## Repository structure

cloudcost-ai/

├── frontend/          ← React + Vite app

│   ├── src/

│   │   ├── components/    ← reusable UI components

│   │   ├── pages/         ← route-level page components

│   │   ├── hooks/         ← custom React hooks

│   │   ├── lib/           ← supabase client, axios instance

│   │   └── utils/         ← helper functions

│   ├── .env.local         ← frontend env vars (gitignored)

│   └── vite.config.js

├── backend/           ← Node.js + Express API

│   ├── src/

│   │   ├── routes/        ← Express route handlers

│   │   ├── services/      ← business logic (aws, ai, stripe, email)

│   │   ├── middleware/     ← auth, error handling

│   │   └── utils/         ← helpers

│   ├── .env               ← backend env vars (gitignored)

│   └── index.js           ← entry point

├── CLAUDE_[CONTEXT.md](http://CONTEXT.md)  ← this file

├── [PROGRESS.md](http://PROGRESS.md)        ← build progress log

└── [README.md](http://README.md)

---

## Environment variables

FRONTEND (.env.local)

VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=

VITE_API_URL=[http://localhost:3001](http://localhost:3001)

BACKEND (.env)

PORT=3001

SUPABASE_URL=

SUPABASE_SERVICE_KEY=

ANTHROPIC_API_KEY=

STRIPE_SECRET_KEY=

STRIPE_WEBHOOK_SECRET=

RESEND_API_KEY=

AWS_REGION=us-east-1

RULE: Never hardcode secrets. Always use process.env. Always check .gitignore.

---

## Core product logic (how the audit works)

1. Customer signs up → lands on dashboard

2. Customer clicks "Connect AWS Account"

3. We show them a step-by-step IAM role setup wizard

4. They paste their IAM Role ARN into our app

5. We store the ARN in Supabase against their user record

6. Customer clicks "Run Audit"

7. Backend assumes their IAM role using AWS STS AssumeRole

8. We fetch: Cost Explorer (last 3 months), EC2 instances + CloudWatch

   CPU metrics, unattached EBS volumes, unassociated EIPs, RDS instances

9. We build a structured data payload and send to Anthropic API

10. Claude analyzes against toolkit patterns (see AI system prompt below)

11. Findings are stored in Supabase and displayed in the app

12. Report is emailed to the customer via Resend

13. Pro tier: automated monthly re-run via cron job

---

## AI system prompt (inject this for every audit call)

SYSTEM:

You are an AWS cost optimization expert. Analyze the provided AWS account

data and identify cost waste using these patterns:

EC2 RIGHTSIZING:

- avg CPU < 20% over 30 days = downsize candidate (one tier)

- avg CPU < 10% = downsize two tiers or migrate to Graviton

- instances running 24/7 with no Savings Plan = Reserved Instance candidate

- t3.medium+ on non-bursty workloads = consider t4g (20% cheaper)

UNUSED RESOURCES:

- unassociated Elastic IPs = $3.60/mo each, release immediately

- NAT Gateways with 0 bytes processed in 7 days = idle, review for deletion

- unattached EBS volumes (state: available) = pure waste, snapshot + delete

- Load Balancers with 0 requests in 30 days = delete or reassign

- stopped EC2 instances > 7 days = terminate or snapshot + terminate

PURCHASE MODEL:

- always-on instances (>720 hrs/mo) with no Savings Plan = immediate action

- Savings Plan utilization < 90% = over-committed, flag it

- batch/non-critical workloads on On-Demand = Spot candidate

OUTPUT FORMAT:

Return a JSON object with this exact structure:

{

  "summary": "2-3 sentence executive summary",

  "total_estimated_savings": <number in USD per month>,

  "findings": [

    {

      "id": "unique-id",

      "severity": "critical|high|medium|low",

      "category": "unused|oversized|purchase_model|architecture",

      "service": "EC2|RDS|S3|NAT|EIP|EBS|LB",

      "resource_id": "specific resource ID or 'multiple'",

      "title": "short title",

      "description": "what the problem is",

      "estimated_monthly_savings": <number>,

      "effort": "low|medium|high",

      "action": "specific actionable fix"

    }

  ],

  "quick_wins": ["top 3 immediate actions as strings"],

  "ninety_day_plan": {

    "month_1": ["action items"],

    "month_2": ["action items"],

    "month_3": ["action items"]

  }

}

---

## Supabase database schema

TABLE: profiles

- id (uuid, FK to auth.users)

- email (text)

- full_name (text)

- plan (text: 'free'|'pro'|'team')

- stripe_customer_id (text)

- created_at (timestamptz)

TABLE: aws_accounts

- id (uuid)

- user_id (uuid, FK to profiles)

- account_name (text)

- role_arn (text)

- external_id (text)

- last_audit_at (timestamptz)

- created_at (timestamptz)

TABLE: audit_reports

- id (uuid)

- user_id (uuid, FK to profiles)

- aws_account_id (uuid, FK to aws_accounts)

- status (text: 'pending'|'running'|'complete'|'failed')

- findings (jsonb)

- total_savings (numeric)

- created_at (timestamptz)

---

## Pages and routes

/ → Landing page (public)

/login → Login page

/signup → Signup page

/dashboard → Main dashboard (auth required)

/dashboard/connect → AWS account connection wizard (auth required)

/dashboard/reports → List of past audit reports (auth required)

/dashboard/reports/:id → Single report view (auth required)

/dashboard/settings → Account and billing settings (auth required)

---

## Design principles

- Clean, professional, minimal — think Linear or Vercel's aesthetic

- Color palette: dark navy (#0F172A) primary, green (#10B981) accent

- Font: Inter (load from Google Fonts)

- Every page works on mobile

- Loading states on every async action

- Error states on every form

- Never show raw error messages to users

---

## Current build status

Check [PROGRESS.md](http://PROGRESS.md) in this repo for the latest completed features.

Always read [PROGRESS.md](http://PROGRESS.md) before starting a new session.

---

## Rules Claude Code must follow

1. Never hardcode secrets or API keys

2. Always add .env files to .gitignore before first commit

3. Every API endpoint requires auth middleware (except /health)

4. All AWS calls are read-only — no write permissions ever

5. Handle errors gracefully — never crash, always return structured errors

6. Use async/await, not callbacks

7. Comment complex logic but keep code clean

8. Ask before deviating from the tech stack above