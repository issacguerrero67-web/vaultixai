import { Link } from 'react-router-dom'

export default function FeatureGate({ isPaid, children, message = 'Upgrade to access this feature', style = {} }) {
  if (isPaid) return children

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(17,17,16,0.75)',
        borderRadius: 8,
        gap: 12,
        padding: 24,
      }}>
        <div style={{ fontSize: 28 }}>🔒</div>
        <p style={{ color: '#F5F4F0', fontSize: 15, fontWeight: 600, margin: 0, textAlign: 'center' }}>{message}</p>
        <Link
          to="/dashboard/billing"
          style={{
            backgroundColor: '#3B82F6', color: '#fff', textDecoration: 'none',
            borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600,
          }}
        >
          Upgrade Plan →
        </Link>
      </div>
    </div>
  )
}
