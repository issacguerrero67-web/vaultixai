import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendAuditReport(userEmail, findings, totalSavings, accountName) {
  const highFindings = findings.filter(f => f.severity === 'high')
  const mediumFindings = findings.filter(f => f.severity === 'medium')
  const lowFindings = findings.filter(f => f.severity === 'low')

  const SEV_COLOR = { high: '#EF4444', medium: '#F59E0B', low: '#6B7280' }

  const findingsHtml = findings.map(f => `
    <div style="margin-bottom: 24px; padding: 16px; background: #1a1a1a; border-radius: 8px; border-left: 3px solid ${SEV_COLOR[f.severity] || '#6B7280'}">
      <div style="margin-bottom: 8px;">
        <span style="background: ${SEV_COLOR[f.severity] || '#6B7280'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase;">${f.severity}</span>
        <span style="background: #333; color: #999; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 6px;">${f.category}</span>
      </div>
      <h3 style="color: #F5F4F0; margin: 8px 0; font-size: 15px;">${f.title}</h3>
      <p style="color: #9CA3AF; margin: 4px 0; font-size: 13px;">${f.description}</p>
      <p style="color: #9CA3AF; margin: 8px 0 0 0; font-size: 13px;">→ ${f.recommendation}</p>
      ${f.estimatedMonthlySavings > 0 ? `<p style="color: #22C55E; margin: 8px 0 0 0; font-size: 13px; font-weight: 600;">Estimated savings: $${f.estimatedMonthlySavings}/mo</p>` : ''}
    </div>
  `).join('')

  await resend.emails.send({
    from: 'Vaultix AI <reports@vaultixai.app>',
    to: userEmail,
    subject: `Your AWS Cost Audit Report — ${highFindings.length} high priority findings`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="background: #111110; color: #F5F4F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto;">

          <div style="margin-bottom: 32px;">
            <h1 style="color: #F5F4F0; font-size: 24px; margin: 0 0 8px 0;">
              <span style="color: #3B82F6;">●</span> Vaultix AI
            </h1>
            <p style="color: #6B7280; margin: 0; font-size: 14px;">AWS Cost Audit Report</p>
          </div>

          <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
            <h2 style="color: #F5F4F0; margin: 0 0 16px 0; font-size: 18px;">Audit Summary — ${accountName}</h2>
            <div style="display: flex; gap: 24px; flex-wrap: wrap;">
              <div>
                <div style="color: #EF4444; font-size: 24px; font-weight: 700;">${highFindings.length}</div>
                <div style="color: #6B7280; font-size: 12px;">High severity</div>
              </div>
              <div>
                <div style="color: #F59E0B; font-size: 24px; font-weight: 700;">${mediumFindings.length}</div>
                <div style="color: #6B7280; font-size: 12px;">Medium severity</div>
              </div>
              <div>
                <div style="color: #6B7280; font-size: 24px; font-weight: 700;">${lowFindings.length}</div>
                <div style="color: #6B7280; font-size: 12px;">Low severity</div>
              </div>
              ${totalSavings > 0 ? `
              <div>
                <div style="color: #22C55E; font-size: 24px; font-weight: 700;">$${totalSavings}/mo</div>
                <div style="color: #6B7280; font-size: 12px;">Potential savings</div>
              </div>` : ''}
            </div>
          </div>

          <h2 style="color: #F5F4F0; font-size: 16px; margin: 0 0 16px 0;">Findings</h2>
          ${findingsHtml}

          <div style="margin-top: 32px; padding: 24px; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); border-radius: 12px; text-align: center;">
            <p style="color: #F5F4F0; margin: 0 0 16px 0; font-weight: 600;">Want us to implement these fixes for you?</p>
            <p style="color: #9CA3AF; margin: 0 0 16px 0; font-size: 13px;">You only pay a percentage of what we save you.</p>
            <a href="https://vaultixai.app/dashboard/billing" style="background: #3B82F6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Plans →</a>
          </div>

          <div style="margin-top: 32px; text-align: center; color: #4B5563; font-size: 12px;">
            <p>Vaultix AI — AWS Cost Intelligence</p>
            <p><a href="https://vaultixai.app" style="color: #4B5563;">vaultixai.app</a></p>
          </div>

        </div>
      </body>
      </html>
    `,
  })
}
