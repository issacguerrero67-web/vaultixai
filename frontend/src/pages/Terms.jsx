import { Link } from 'react-router-dom'

export default function Terms() {
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
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#F5F4F0', marginBottom: 8, letterSpacing: '-0.02em' }}>Terms of Service</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 48 }}>Last updated: June 26, 2026</p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 0, marginBottom: 12 }}>1. Acceptance of Terms</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          By accessing or using Vaultix AI ("the Service") at vaultixai.app, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users, including free tier and paid subscribers.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          These Terms constitute a legally binding agreement between you and Vaultix AI. If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these terms.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>2. Description of Service</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          Vaultix AI is an AI-powered cloud cost optimization platform. The Service analyzes your cloud infrastructure to identify waste, unused resources, and cost optimization opportunities. Our Autopilot feature can implement approved changes with your explicit authorization.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          The Service operates on a success-based pricing model: you pay only when we identify and deliver verified savings. Free access is available with limited features.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>3. Pricing and Payment</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          Vaultix AI charges a percentage of verified monthly savings identified by the Service. Current rates are:
        </p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 8 }}><strong style={{ color: '#F5F4F0' }}>Standard plan:</strong> 20% of verified monthly savings</li>
          <li style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 8 }}><strong style={{ color: '#F5F4F0' }}>Team plan:</strong> 15% of verified monthly savings</li>
          <li style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 8 }}><strong style={{ color: '#F5F4F0' }}>Enterprise:</strong> Custom rate negotiated based on portfolio size</li>
        </ul>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12, marginTop: 12 }}>
          Payments are processed by Stripe. "Verified savings" means cost reductions confirmed through before-and-after billing data from your cloud provider. You will not be charged for potential or projected savings — only for savings that have been realized and confirmed.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          All fees are billed in USD. Subscriptions renew monthly unless cancelled. You can manage or cancel your subscription at any time from the Billing page in your dashboard.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>4. Cloud Access and Security</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          To use the Service, you grant Vaultix AI read-only access to your cloud account via a cross-account IAM role. This access is used exclusively to list and describe resources for the purpose of identifying cost optimizations.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          By connecting your cloud account, you represent that you are authorized to grant this access and that doing so does not violate any agreement you have with your cloud provider or employer.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          Write access for Autopilot actions is requested separately and requires your explicit authorization for each action category. You can revoke any or all access at any time by deleting the IAM role from your cloud account.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>5. Acceptable Use</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>You agree not to:</p>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {[
            'Attempt to reverse engineer, scrape, or misuse the Vaultix AI platform',
            'Share your account credentials or provide access to unauthorized users',
            'Use the Service to access cloud accounts you are not authorized to access',
            'Create multiple accounts to circumvent plan limits or free tier restrictions',
            'Use the Service in any way that violates applicable laws or regulations',
            'Attempt to interfere with the availability or integrity of the Service',
          ].map((item, i) => (
            <li key={i} style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 8 }}>{item}</li>
          ))}
        </ul>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>6. Limitation of Liability</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          Vaultix AI provides analysis and recommendations. You are solely responsible for all decisions made regarding your cloud infrastructure. We are not liable for any cloud charges, service disruptions, or data loss that result from actions you take based on our recommendations.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          Infrastructure changes made through Autopilot require your explicit approval. Once approved and executed, Vaultix AI is not liable for unintended consequences of changes you authorized.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          To the maximum extent permitted by law, Vaultix AI's total liability to you for any claim arising from these terms or the Service is limited to the amounts you paid us in the 3 months preceding the claim.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>7. Termination</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          You may delete your account at any time from the Settings page in your dashboard. Upon deletion, your cloud credentials are immediately invalidated in our system and all associated data is scheduled for permanent deletion within 30 days.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          We reserve the right to suspend or terminate accounts that violate these Terms, with or without notice.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>8. Changes to Terms</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          We may update these Terms from time to time. When we make material changes, we will notify you by email or by displaying a notice in the dashboard. Continued use of the Service after changes are posted constitutes your acceptance of the updated Terms.
        </p>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          If you do not agree to the updated Terms, you must stop using the Service and delete your account.
        </p>

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginTop: 40, marginBottom: 12 }}>9. Contact</h2>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
          Questions about these Terms? Contact us at{' '}
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
