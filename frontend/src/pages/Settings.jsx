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
  { label: 'Billing',      icon: '◇', path: '/dashboard/billing' },
  { label: 'AWS Accounts', icon: '⊕', path: '/dashboard/accounts' },
  { label: 'Autopilot',    icon: '✦', path: '/dashboard/autopilot' },
  { label: 'Settings',     icon: '⊙', path: '/dashboard/settings' },
]

function NavItem({ label, icon, path, active }) {
  return (
    <Link
      to={path}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 20px',
        fontSize: '13px', fontWeight: active ? 600 : 400,
        color: active ? '#F5F4F0' : '#666662',
        backgroundColor: active ? '#1A1A18' : 'transparent',
        borderLeft: active ? '2px solid #3B82F6' : '2px solid transparent',
        textDecoration: 'none',
        transition: 'color 150ms, background-color 150ms',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#A8A8A4' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#666662' }}
    >
      <span style={{ fontSize: '14px', opacity: 0.7 }}>{icon}</span>
      {label}
    </Link>
  )
}

function SectionCard({ title, children }) {
  return (
    <div style={{
      backgroundColor: '#161615',
      border: '1px solid #1E1E1C',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '20px',
    }}>
      <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#F5F4F0', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState('')

  // AWS accounts
  const [awsAccounts, setAwsAccounts] = useState([])
  const [disconnectingId, setDisconnectingId] = useState(null)
  const [confirmDisconnectId, setConfirmDisconnectId] = useState(null)
  const [disconnectError, setDisconnectError] = useState('')

  // Plan
  const [plan, setPlan] = useState('standard')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }

      setUserEmail(session.user.email)
      setUserId(session.user.id)

      const [profileRes, accountsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, plan').eq('id', session.user.id).single(),
        supabase.from('aws_accounts').select('id, account_name, role_arn, created_at').eq('user_id', session.user.id),
      ])

      if (profileRes.data) {
        setDisplayName(profileRes.data.full_name ?? '')
        setPlan(profileRes.data.plan ?? 'standard')
      }
      if (accountsRes.data) {
        setAwsAccounts(accountsRes.data)
      }

      setLoading(false)
    }
    init()
  }, [navigate])

  async function handleSaveName() {
    if (!displayName.trim()) { setNameError('Display name cannot be empty.'); return }
    setSavingName(true)
    setNameError('')
    setNameSaved(false)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: displayName.trim() })
      .eq('id', userId)

    setSavingName(false)
    if (error) {
      setNameError('Failed to save. Please try again.')
    } else {
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 3000)
    }
  }

  async function handleDisconnect(accountId) {
    setDisconnectingId(accountId)
    setDisconnectError('')

    const { error } = await supabase
      .from('aws_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId)

    if (error) {
      setDisconnectError('Failed to disconnect account. Please try again.')
      setDisconnectingId(null)
    } else {
      setAwsAccounts(prev => prev.filter(a => a.id !== accountId))
      setDisconnectingId(null)
      setConfirmDisconnectId(null)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  const PLAN_LABELS = { standard: 'Standard', team: 'Team', enterprise: 'Enterprise' }

  if (loading) {
    return (
      <div style={{
        fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
        backgroundColor: '#111110',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: '#666662', fontSize: '14px' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={{
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
      backgroundColor: '#111110',
      color: '#F5F4F0',
      minHeight: '100vh',
      display: 'flex',
      overflowX: 'hidden', width: '100%', maxWidth: '100vw',
    }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        backgroundColor: '#0D0D0D',
        borderRight: '1px solid #1E1E1C',
        display: isMobile ? 'none' : 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1E1E1C' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#3B82F6',
              boxShadow: '0 0 8px rgba(59,130,246,0.8), 0 0 16px rgba(59,130,246,0.4)',
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '-0.02em', color: '#F5F4F0' }}>
              Vaultix AI
            </span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ label, icon, path }) => (
            <NavItem key={path} label={label} icon={icon} path={path} active={location.pathname === path} />
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #1E1E1C' }}>
          {displayName ? (
            <>
              <div style={{ fontSize: 13, color: '#F5F4F0', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userEmail}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: '#666662', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail}
            </div>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: '1px solid #1E1E1C',
              borderRadius: '6px',
              color: '#666662',
              fontSize: '13px',
              fontWeight: 500,
              padding: '7px 0',
              cursor: signingOut ? 'not-allowed' : 'pointer',
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
      <main style={{ marginLeft: isMobile ? 0 : '240px', flex: 1, padding: isMobile ? '16px 16px 70px' : '32px', maxWidth: '720px', minWidth: 0, overflowX: 'hidden' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em' }}>
            Settings
          </h1>
          <p style={{ fontSize: '13px', color: '#666662', margin: '6px 0 0' }}>
            Manage your account, connected AWS accounts, and plan.
          </p>
        </div>

        {/* ── PROFILE ── */}
        <SectionCard title="Profile">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#888884', marginBottom: '6px', fontWeight: 500 }}>
                Display name
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
                  placeholder="Your name"
                  style={{
                    flex: 1,
                    backgroundColor: '#111110',
                    border: '1px solid #2A2A28',
                    borderRadius: '8px',
                    color: '#F5F4F0',
                    fontSize: '13px',
                    padding: '9px 12px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#3B82F6' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#2A2A28' }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  style={{
                    backgroundColor: '#3B82F6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: savingName ? 'not-allowed' : 'pointer',
                    opacity: savingName ? 0.7 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
              </div>
              {nameError && (
                <p style={{ fontSize: '12px', color: '#EF4444', margin: '6px 0 0' }}>{nameError}</p>
              )}
              {nameSaved && (
                <p style={{ fontSize: '12px', color: '#22C55E', margin: '6px 0 0' }}>Name saved.</p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#888884', marginBottom: '6px', fontWeight: 500 }}>
                Email
              </label>
              <input
                type="email"
                value={userEmail}
                readOnly
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  backgroundColor: '#0D0D0D',
                  border: '1px solid #1E1E1C',
                  borderRadius: '8px',
                  color: '#666662',
                  fontSize: '13px',
                  padding: '9px 12px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  cursor: 'default',
                }}
              />
              <p style={{ fontSize: '11px', color: '#3B3B38', margin: '5px 0 0' }}>
                Email cannot be changed here. Contact support if needed.
              </p>
            </div>

          </div>
        </SectionCard>

        {/* ── CONNECTED AWS ACCOUNTS ── */}
        <SectionCard title="Connected AWS Accounts">
          {awsAccounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: '13px', color: '#666662', margin: '0 0 12px' }}>
                No AWS accounts connected yet.
              </p>
              <Link
                to="/dashboard/connect"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#3B82F6',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 18px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                Connect AWS Account →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {awsAccounts.map(account => (
                <div key={account.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  backgroundColor: '#111110',
                  border: '1px solid #1E1E1C',
                  borderRadius: '8px',
                  gap: '12px',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F5F4F0', marginBottom: '2px' }}>
                      {account.account_name}
                    </div>
                    <div style={{
                      fontSize: '11px', color: '#3B3B38',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {account.role_arn}
                    </div>
                  </div>

                  {confirmDisconnectId === account.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, color: '#ef4444' }}>Remove this account?</span>
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        disabled={disconnectingId === account.id}
                        style={{
                          background: 'rgba(239,68,68,0.15)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '13px',
                          cursor: disconnectingId === account.id ? 'not-allowed' : 'pointer',
                          marginLeft: '8px',
                          opacity: disconnectingId === account.id ? 0.7 : 1,
                        }}
                      >
                        {disconnectingId === account.id ? 'Removing…' : 'Yes, remove'}
                      </button>
                      <button
                        onClick={() => setConfirmDisconnectId(null)}
                        style={{
                          background: 'none',
                          border: '1px solid #2a2a28',
                          color: '#6b7280',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          marginLeft: '6px',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setConfirmDisconnectId(account.id); setDisconnectError('') }}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #2A2A28',
                        borderRadius: '6px',
                        color: '#888884',
                        fontSize: '12px',
                        fontWeight: 500,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'border-color 150ms, color 150ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A28'; e.currentTarget.style.color = '#888884' }}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              ))}

              {disconnectError && (
                <p style={{ fontSize: '12px', color: '#EF4444', margin: '4px 0 0' }}>{disconnectError}</p>
              )}
            </div>
          )}
        </SectionCard>

        {/* ── PLAN ── */}
        <SectionCard title="Plan">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#F5F4F0', marginBottom: '4px' }}>
                {plan === 'team' ? 'Team Plan' : plan === 'enterprise' ? 'Enterprise' : 'Standard (Success-Based)'}
              </div>
              <div style={{ fontSize: '12px', color: '#666662' }}>
                {plan === 'team'
                  ? 'You pay 15% of verified savings found.'
                  : plan === 'enterprise'
                  ? 'Custom rate — contact your account manager.'
                  : 'You pay 20% of verified savings found. No savings = no charge.'}
              </div>
            </div>
            <Link
              to="/dashboard/billing"
              style={{
                backgroundColor: '#3B82F6',
                border: 'none',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Manage Billing
            </Link>
          </div>
        </SectionCard>

      </main>

      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#1a1a18', borderTop: '1px solid #2a2a28',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '8px 0 12px', zIndex: 1000,
        }}>
          {[
            { label: 'Dashboard', path: '/dashboard', icon: '⊡' },
            { label: 'Reports',   path: '/dashboard/reports', icon: '≡' },
            { label: 'Autopilot', path: '/dashboard/autopilot', icon: '✦' },
            { label: 'Accounts',  path: '/dashboard/accounts', icon: '⊕' },
            { label: 'Settings',  path: '/dashboard/settings', icon: '⊙' },
          ].map(({ label, path, icon }) => {
            const isActive = window.location.pathname === path
            return (
              <a key={path} href={path} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, textDecoration: 'none',
                color: isActive ? '#3B82F6' : '#6b7280',
                fontSize: 10, fontWeight: isActive ? 600 : 400, minWidth: 48,
              }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span>{label}</span>
              </a>
            )
          })}
        </nav>
      )}
    </div>
  )
}
