import { Link } from 'react-router-dom'

export default function FeatureGate({ isPaid, children, message = 'Unlock your audit to access this feature', savingsFound = 0, style = {} }) {
  if (isPaid) return children

  const rate = 0.20
  let fee = savingsFound * rate
  if (savingsFound > 0 && fee < 19) fee = 19

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(17,17,16,0.85)',
        borderRadius: 8,
        gap: 16,
        padding: 32,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div>
          <p style={{ color: '#F5F4F0', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{message}</p>
          <p style={{ color: '#9ca3af', fontSize: 13, margin: 0, lineHeight: 1.6, maxWidth: 360 }}>
            Chat with AI about your specific findings and get personalized, step-by-step recommendations for your exact infrastructure.
          </p>
        </div>
        <Link
          to="/dashboard/billing"
          style={{
            backgroundColor: '#3B82F6', color: '#fff', textDecoration: 'none',
            borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 700,
          }}
        >
          {savingsFound > 0 ? `Unlock Full Audit — $${fee.toFixed(2)}` : 'Unlock Full Audit →'}
        </Link>
        <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
          One-time payment · No subscription · Only pay when we find savings
        </p>
      </div>
    </div>
  )
}
