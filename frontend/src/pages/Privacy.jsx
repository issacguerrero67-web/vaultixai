import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div style={{ minHeight: '100vh', background: '#111110', color: '#F5F4F0', fontFamily: 'Geist, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 2.5rem', borderBottom: '1px solid #1E1E1C',
        position: 'sticky', top: 0, background: 'rgba(17,17,16,0.95)',
        backdropFilter: 'blur(12px)', zIndex: 100,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 600, color: '#F5F4F0', textDecoration: 'none', letterSpacing: '-0.01em' }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: '#1A1A18', border: '1px solid #333330', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>V</div>
          Vaultix AI
        </Link>
        <Link to="/dashboard" style={{ background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
          Go to Dashboard →
        </Link>
      </nav>

      {/* CONTENT */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B82F6', marginBottom: 16 }}>Legal</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#F5F4F0', marginBottom: 8, letterSpacing: '-0.02em' }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 48 }}>Last updated: June 26, 2026</p>

        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          Vaultix AI ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use our cloud cost optimization platform at vaultixai.app.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>1. Information We Collect</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          <strong style={{ color: '#F5F4F0' }}>Account information:</strong> When you sign up, we collect your email address and password (hashed). You may optionally provide a display name.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          <strong style={{ color: '#F5F4F0' }}>Cloud credentials:</strong> To perform cost audits, we collect read-only IAM role ARNs and external IDs that you provide. These credentials grant read-only access to your cloud account and are stored encrypted at rest.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          <strong style={{ color: '#F5F4F0' }}>Usage data:</strong> We collect information about how you interact with the platform — pages visited, audit runs initiated, reports viewed, and Autopilot queries made. This data is used solely to improve the service.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          <strong style={{ color: '#F5F4F0' }}>Billing information:</strong> Payment details are processed by Stripe. We store only the information Stripe returns to us (subscription status, plan tier, last-4 of card). We never see or store your full card number.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>2. How We Use Your Information</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          We use the information we collect to provide and improve the Vaultix AI service. Specifically:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {[
            'To authenticate your account and maintain your session',
            'To connect to your cloud account and perform cost audits using your provided credentials',
            'To generate cost reports and surface optimization recommendations',
            'To send you report summaries and alert emails (you can unsubscribe at any time)',
            'To process your subscription payments and manage your billing status',
            'To respond to support requests you send us',
          ].map((item, i) => (
            <li key={i} style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 8 }}>{item}</li>
          ))}
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>3. AWS and Cloud Provider Access</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          Vaultix AI uses <strong style={{ color: '#F5F4F0' }}>read-only</strong> access to your cloud accounts. We use cross-account IAM roles with the minimum permissions required to list and describe resources. We never modify, delete, or create infrastructure in your cloud account without your explicit approval.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          Role ARNs and external IDs are stored encrypted in our database. You can revoke access at any time by deleting the IAM role from your cloud account — this immediately terminates our access.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          The Autopilot feature may request additional write permissions to implement approved optimizations. These permissions are requested separately and you must explicitly grant them. All Autopilot actions are logged and visible in your dashboard.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>4. Data Sharing</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          We do not sell, rent, or trade your personal information. We share data only with the following third-party service providers, and only to the extent necessary to operate the service:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {[
            'Stripe — payment processing and subscription management',
            'Resend — transactional email delivery (reports, alerts, receipts)',
            'Anthropic — AI analysis for Autopilot features (query text only; no credentials or account metadata)',
            'Supabase — database hosting and user authentication',
          ].map((item, i) => (
            <li key={i} style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 8 }}>{item}</li>
          ))}
        </ul>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12, marginTop: 12 }}>
          We may disclose information if required by law or to protect the rights and safety of our users.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>5. Data Retention</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          We retain your account data and audit reports for as long as your account is active. If you delete your account, all associated data — including cloud credentials, audit reports, and profile information — is permanently deleted within 30 days.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          Billing records may be retained for up to 7 years as required by applicable financial regulations.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>6. Security</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          We take security seriously. Our practices include:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {[
            'All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)',
            'API keys and role ARNs are stored hashed using SHA-256',
            'Row-level security (RLS) is enforced on all database tables — users can only access their own data',
            'Authentication is handled by Supabase with email verification and secure session management',
            'We do not log or store cloud API responses beyond what is required for audit reports',
          ].map((item, i) => (
            <li key={i} style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 8 }}>{item}</li>
          ))}
        </ul>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12, marginTop: 12 }}>
          No system is 100% secure. If you discover a security vulnerability, please report it to hello@vaultixai.app.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>7. Contact</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          If you have questions about this Privacy Policy or how we handle your data, contact us at{' '}
          <a href="mailto:hello@vaultixai.app" style={{ color: '#3B82F6', textDecoration: 'none' }}>hello@vaultixai.app</a>.
        </p>
      </div>

      {/* FOOTER */}
      <footer style={{ padding: '24px 48px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div />
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="/privacy" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>Privacy</a>
          <a href="/terms" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>Terms</a>
          <a href="mailto:hello@vaultixai.app" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>Contact</a>
        </div>
        <p style={{ fontSize: 12, color: '#444', textAlign: 'right', margin: 0 }}>© 2026 Vaultix AI · Built for engineers, by engineers.</p>
      </footer>
    </div>
  )
}
