import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function brandedEmail(title, bodyHtml) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
    <body style="margin:0;padding:0;background:#111110;font-family:'Geist',system-ui,-apple-system,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#111110;padding:40px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

            <!-- Header -->
            <tr><td style="padding:0 0 32px 0;text-align:center;">
              <div style="display:inline-block;background:#3B82F6;border-radius:10px;width:40px;height:40px;line-height:40px;text-align:center;font-size:20px;font-weight:800;color:white;margin-bottom:12px;">V</div>
              <div style="font-size:18px;font-weight:700;color:#F5F4F0;letter-spacing:-0.3px;">Vaultix AI</div>
            </td></tr>

            <!-- Card -->
            <tr><td style="background:#1a1a18;border:1px solid #2a2a28;border-radius:12px;padding:40px;">
              <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#F5F4F0;letter-spacing:-0.5px;">${title}</h1>
              ${bodyHtml}
            </td></tr>

            <!-- Footer -->
            <tr><td style="padding:24px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#444;">Vaultix AI · <a href="mailto:hello@vaultixai.app" style="color:#444;text-decoration:none;">hello@vaultixai.app</a></p>
              <p style="margin:4px 0 0 0;font-size:12px;color:#333;">Cloud Cost Intelligence · vaultixai.app</p>
            </td></tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `
}

export async function sendWelcomeEmail(userEmail, userName, plan) {
  const displayName = userName || 'there'
  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Standard'

  const body = `
    <p style="margin:8px 0 0 0;color:#9ca3af;font-size:15px;line-height:1.6;">
      Hi ${displayName}, welcome to Vaultix AI. You're now on the <strong style="color:#F5F4F0;">${planLabel}</strong> plan.
    </p>

    <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:16px 20px;margin:24px 0;">
      <span style="color:#22c55e;font-weight:600;">✓ Your plan is active.</span>
      <span style="color:#9ca3af;font-size:14px;"> You only pay when we find real savings.</span>
    </div>

    <p style="color:#F5F4F0;font-size:15px;font-weight:600;margin:24px 0 12px 0;">Here's how to get started:</p>
    <ol style="color:#9ca3af;font-size:14px;line-height:2;margin:0;padding-left:20px;">
      <li>Connect your AWS account — takes 5 minutes</li>
      <li>Run your first AI cost audit</li>
      <li>Review findings and let Autopilot fix issues automatically</li>
    </ol>

    <div style="text-align:center;">
      <a href="https://vaultixai.app/dashboard" style="background:#3B82F6;color:white;border-radius:6px;padding:14px 28px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;margin:24px 0 0 0;">
        Go to Dashboard →
      </a>
    </div>

    <p style="color:#444;font-size:12px;margin:24px 0 0 0;">
      You're receiving this because you signed up for Vaultix AI. Questions? Reply to this email.
    </p>
  `

  await resend.emails.send({
    from: 'Vaultix AI <hello@vaultixai.app>',
    to: userEmail,
    subject: 'Welcome to Vaultix AI 🎉',
    html: brandedEmail('Welcome aboard.', body),
  })
}

export async function sendPaymentConfirmationEmail(userEmail, userName, plan, savingsRate) {
  const displayName = userName || 'there'
  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Standard'

  const body = `
    <p style="margin:8px 0 0 0;color:#9ca3af;font-size:15px;line-height:1.6;">
      Hi ${displayName}, your payment was processed and your <strong style="color:#F5F4F0;">${planLabel}</strong> plan is now active.
    </p>

    <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:16px 20px;margin:24px 0;">
      <span style="color:#3B82F6;font-size:18px;">💙</span>
      <span style="color:#9ca3af;font-size:14px;">
        <strong style="color:#F5F4F0;">Success-based pricing:</strong>
        You only pay ${savingsRate}% of verified savings we find. No savings = no charge.
      </span>
    </div>

    <div style="background:#111110;border:1px solid #2a2a28;border-radius:8px;padding:16px 20px;margin:0 0 24px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0;">Plan</td>
          <td style="color:#F5F4F0;font-size:13px;font-weight:600;text-align:right;">${planLabel}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0;">Rate</td>
          <td style="color:#F5F4F0;font-size:13px;font-weight:600;text-align:right;">${savingsRate}% of verified savings</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0;">Status</td>
          <td style="color:#22c55e;font-size:13px;font-weight:600;text-align:right;">Active</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0;">Autopilot</td>
          <td style="color:#F5F4F0;font-size:13px;font-weight:600;text-align:right;">Included</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;">
      <a href="https://vaultixai.app/dashboard/connect" style="background:#3B82F6;color:white;border-radius:6px;padding:14px 28px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">
        Connect Your Cloud Account →
      </a>
    </div>

    <p style="color:#444;font-size:12px;margin:24px 0 0 0;">
      Questions about billing? Contact us at <a href="mailto:hello@vaultixai.app" style="color:#444;">hello@vaultixai.app</a>
    </p>
  `

  await resend.emails.send({
    from: 'Vaultix AI <hello@vaultixai.app>',
    to: userEmail,
    subject: `Your Vaultix AI ${planLabel} Plan is Active`,
    html: brandedEmail('Payment confirmed.', body),
  })
}

export async function sendCancellationEmail(userEmail, userName) {
  const displayName = userName || 'there'

  const body = `
    <p style="margin:8px 0 0 0;color:#9ca3af;font-size:15px;line-height:1.6;">
      Hi ${displayName}, your Vaultix AI subscription has been cancelled. You'll retain access until the end of your current billing period.
    </p>

    <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:16px 20px;margin:24px 0;">
      <span style="color:#f59e0b;font-weight:600;">Your audit history and findings are saved.</span>
      <span style="color:#9ca3af;font-size:14px;"> You can reactivate your plan at any time.</span>
    </div>

    <div style="text-align:center;">
      <a href="https://vaultixai.app/dashboard/billing" style="background:#3B82F6;color:white;border-radius:6px;padding:14px 28px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;margin:0 0 24px 0;">
        Reactivate Plan →
      </a>
    </div>

    <p style="color:#444;font-size:12px;margin:0;">
      Changed your mind? We'd love to have you back. Reply to this email and tell us how we can improve.
    </p>
  `

  await resend.emails.send({
    from: 'Vaultix AI <hello@vaultixai.app>',
    to: userEmail,
    subject: 'Your Vaultix AI subscription has been cancelled',
    html: brandedEmail('Subscription cancelled.', body),
  })
}

export async function sendAuditReport(userEmail, findings, totalSavings, accountName) {
  const highFindings = findings.filter(f => f.severity === 'high')
  const mediumFindings = findings.filter(f => f.severity === 'medium')
  const lowFindings = findings.filter(f => f.severity === 'low')

  const SEV_COLOR = { high: '#EF4444', medium: '#F59E0B', low: '#6B7280' }

  const findingsHtml = findings.map(f => `
    <div style="margin-bottom:24px;padding:16px;background:#111110;border-radius:8px;border-left:3px solid ${SEV_COLOR[f.severity] || '#6B7280'}">
      <div style="margin-bottom:8px;">
        <span style="background:${SEV_COLOR[f.severity] || '#6B7280'};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;">${f.severity}</span>
        <span style="background:#222;color:#999;padding:2px 8px;border-radius:4px;font-size:11px;margin-left:6px;">${f.category}</span>
      </div>
      <h3 style="color:#F5F4F0;margin:8px 0;font-size:15px;">${f.title}</h3>
      <p style="color:#9CA3AF;margin:4px 0;font-size:13px;">${f.description}</p>
      <p style="color:#9CA3AF;margin:8px 0 0 0;font-size:13px;">→ ${f.recommendation}</p>
      ${f.estimatedMonthlySavings > 0 ? `<p style="color:#22C55E;margin:8px 0 0 0;font-size:13px;font-weight:600;">Estimated savings: $${f.estimatedMonthlySavings}/mo</p>` : ''}
    </div>
  `).join('')

  const body = `
    <p style="margin:8px 0 24px 0;color:#9ca3af;font-size:14px;">Account: <strong style="color:#F5F4F0;">${accountName}</strong></p>

    <div style="background:#111110;border-radius:8px;padding:20px;margin-bottom:32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;padding:0 16px 0 0;">
            <div style="color:#EF4444;font-size:28px;font-weight:700;">${highFindings.length}</div>
            <div style="color:#6B7280;font-size:12px;">High</div>
          </td>
          <td style="text-align:center;padding:0 16px;">
            <div style="color:#F59E0B;font-size:28px;font-weight:700;">${mediumFindings.length}</div>
            <div style="color:#6B7280;font-size:12px;">Medium</div>
          </td>
          <td style="text-align:center;padding:0 16px;">
            <div style="color:#6B7280;font-size:28px;font-weight:700;">${lowFindings.length}</div>
            <div style="color:#6B7280;font-size:12px;">Low</div>
          </td>
          ${totalSavings > 0 ? `
          <td style="text-align:center;padding:0 0 0 16px;">
            <div style="color:#22C55E;font-size:28px;font-weight:700;">$${totalSavings}/mo</div>
            <div style="color:#6B7280;font-size:12px;">Potential savings</div>
          </td>` : ''}
        </tr>
      </table>
    </div>

    <h2 style="color:#F5F4F0;font-size:16px;font-weight:600;margin:0 0 16px 0;">Findings</h2>
    ${findingsHtml}

    <div style="margin-top:32px;padding:24px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:8px;text-align:center;">
      <p style="color:#F5F4F0;margin:0 0 8px 0;font-weight:600;">Want us to implement these fixes for you?</p>
      <p style="color:#9CA3AF;margin:0 0 16px 0;font-size:13px;">You only pay a percentage of what we save you.</p>
      <a href="https://vaultixai.app/dashboard/billing" style="background:#3B82F6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View Plans →</a>
    </div>
  `

  await resend.emails.send({
    from: 'Vaultix AI <reports@vaultixai.app>',
    to: userEmail,
    subject: `Your Cloud Cost Audit Report — ${highFindings.length} high priority findings`,
    html: brandedEmail('Your audit is ready.', body),
  })
}
