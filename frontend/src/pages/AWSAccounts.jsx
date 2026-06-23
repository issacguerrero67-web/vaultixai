import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const geistFontLink = document.createElement('link')
geistFontLink.rel = 'stylesheet'
geistFontLink.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;900&display=swap'
if (!document.head.querySelector('[href*="Geist"]')) {
  document.head.appendChild(geistFontLink)
}

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: '⊡', path: '/dashboard' },
  { label: 'Reports',      icon: '≡', path: '/dashboard/reports' },
  { label: 'Billing',      icon: '◈', path: '/dashboard/billing' },
  { label: 'AWS Accounts', icon: '⊕', path: '/dashboard/accounts' },
  { label: 'Settings',     icon: '⊙', path: '/dashboard/settings' },
]

export default function AWSAccounts() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [accounts, setAccounts] = useState([])
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      setUserEmail(user.email)
      setUserId(user.id)

      const { data } = await supabase
        .from('aws_accounts')
        .select('id, account_name, role_arn, last_audit_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setAccounts(data ?? [])
      setLoading(false)
    }
    init()
  }, [navigate])

  async function handleDisconnect(accountId) {
    await supabase.from('aws_accounts').delete().eq('id', accountId).eq('user_id', userId)
    setAccounts(prev => prev.filter(a => a.id !== accountId))
    setConfirmingDisconnect(null)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div style={{
        fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
        backgroundColor: '#111110', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: '#666662', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={{
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
      backgroundColor: '#111110', color: '#F5F4F0',
      minHeight: '100vh', display: 'flex',
    }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 240, flexShrink: 0, backgroundColor: '#0D0D0D',
        borderRight: '1px solid #1E1E1C', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1E1E1C' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3B82F6',
              boxShadow: '0 0 8px rgba(59,130,246,0.8), 0 0 16px rgba(59,130,246,0.4)',
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em', color: '#F5F4F0' }}>
              Vaultix AI
            </span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ label, icon, path }) => {
            const active = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 20px', fontSize: 14,
                  fontWeight: active ? 500 : 400,
                  color: active ? '#3B82F6' : '#888884',
                  textDecoration: 'none',
                  borderLeft: active ? '2px solid #3B82F6' : '2px solid transparent',
                  backgroundColor: active ? 'rgba(59,130,246,0.06)' : 'transparent',
                  transition: 'color 150ms, background-color 150ms',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#F5F4F0'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#888884'; e.currentTarget.style.backgroundColor = 'transparent' } }}
              >
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #1E1E1C' }}>
          <div style={{ fontSize: 12, color: '#666662', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              width: '100%', backgroundColor: 'transparent', border: '1px solid #1E1E1C',
              borderRadius: 6, color: '#666662', fontSize: 13, fontWeight: 500,
              padding: '7px 0', cursor: signingOut ? 'not-allowed' : 'pointer',
              transition: 'border-color 150ms, color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B3B38'; e.currentTarget.style.color = '#F5F4F0' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1C'; e.currentTarget.style.color = '#666662' }}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ marginLeft: 240, flex: 1, padding: 32 }}>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em' }}>
            AWS Accounts
          </h1>
          <button
            onClick={() => navigate('/dashboard/connect')}
            style={{
              background: '#3B82F6', color: 'white', border: 'none',
              borderRadius: 6, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2563EB'}
            onMouseLeave={e => e.currentTarget.style.background = '#3B82F6'}
          >
            Connect New Account
          </button>
        </div>

        {/* Empty state */}
        {accounts.length === 0 ? (
          <div style={{
            background: '#1a1a18', border: '1px solid #2a2a28',
            borderRadius: 8, padding: 48, textAlign: 'center',
          }}>
            <span style={{ fontSize: 32, marginBottom: 12, display: 'block' }}>☁</span>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#F5F4F0', margin: '0 0 8px' }}>
              No AWS accounts connected
            </p>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
              Connect your first AWS account to start finding savings.
            </p>
            <button
              onClick={() => navigate('/dashboard/connect')}
              style={{
                background: '#3B82F6', color: '#fff', border: 'none',
                borderRadius: 6, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Connect AWS Account →
            </button>
          </div>
        ) : (
          <div>
            {accounts.map(account => (
              <div key={account.id} style={{
                background: '#1a1a18', border: '1px solid #2a2a28',
                borderRadius: 8, padding: '20px 24px', marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                {/* Left: account info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F4F0' }}>
                    {account.account_name}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 420 }}>
                    {account.role_arn}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    {account.last_audit_at
                      ? 'Last audit: ' + formatDate(account.last_audit_at)
                      : 'No audit run yet'}
                  </span>
                </div>

                {/* Right: actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
                  <span style={{
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                    color: '#22c55e', borderRadius: 20, padding: '4px 12px',
                    fontSize: 12, fontWeight: 600,
                  }}>
                    Connected
                  </span>

                  <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                      background: 'none', border: '1px solid #2a2a28', color: '#F5F4F0',
                      borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                      transition: 'border-color 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a38'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a28'}
                  >
                    Run Audit
                  </button>

                  {confirmingDisconnect === account.id ? (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#ef4444' }}>Remove?</span>
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        style={{
                          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444', borderRadius: 6, padding: '6px 12px',
                          fontSize: 13, cursor: 'pointer', marginLeft: 8,
                        }}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmingDisconnect(null)}
                        style={{
                          background: 'none', border: '1px solid #2a2a28', color: '#6b7280',
                          borderRadius: 6, padding: '6px 12px', fontSize: 13,
                          cursor: 'pointer', marginLeft: 6,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingDisconnect(account.id)}
                      style={{
                        background: 'none', border: '1px solid #2a2a28', color: '#6b7280',
                        borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                        transition: 'border-color 150ms, color 150ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a28'; e.currentTarget.style.color = '#6b7280' }}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
