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
  { label: 'Cloud Accounts', icon: '⊕', path: '/dashboard/accounts' },
  { label: 'Autopilot',    icon: '✦', path: '/dashboard/autopilot' },
  { label: 'Settings',     icon: '⊙', path: '/dashboard/settings' },
]

export default function AWSAccounts() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [userId, setUserId] = useState('')
  const [accounts, setAccounts] = useState([])
  const [userPlan, setUserPlan] = useState(null)
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [expandedPrefs, setExpandedPrefs] = useState({})
  const [accountPrefs, setAccountPrefs] = useState({})
  const [prefsSaved, setPrefsSaved] = useState({})

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      setUserEmail(user.email)
      setUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('full_name, plan').eq('id', user.id).single()
      if (profile?.full_name) setDisplayName(profile.full_name)
      if (profile?.plan) setUserPlan(profile.plan)

      const { data } = await supabase
        .from('aws_accounts')
        .select('id, account_name, role_arn, last_audit_at, created_at, scan_preferences')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const accountsData = data ?? []
      setAccounts(accountsData)

      const defaultPrefs = { regions: ['us-east-1'], services: ['EC2', 'RDS', 'S3', 'EBS', 'Network'] }
      const prefsMap = {}
      for (const account of accountsData) {
        prefsMap[account.id] = account.scan_preferences || defaultPrefs
      }
      setAccountPrefs(prefsMap)

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

  function extractAccountId(roleArn) {
    return roleArn?.match(/::(\d+):/)?.[1] ?? null
  }

  const ALL_REGIONS = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1']
  const ALL_SERVICES = ['EC2', 'RDS', 'S3', 'EBS', 'Network', 'SavingsPlans']

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
      overflowX: 'hidden', width: '100%', maxWidth: '100vw',
    }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 240, flexShrink: 0, backgroundColor: '#0D0D0D',
        borderRight: '1px solid #1E1E1C', display: isMobile ? 'none' : 'flex', flexDirection: 'column',
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
            <div style={{ fontSize: 12, color: '#666662', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail}
            </div>
          )}
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
      <main style={{ marginLeft: isMobile ? 0 : 240, flex: 1, padding: isMobile ? '16px 16px 70px' : 32, minWidth: 0, overflowX: 'hidden' }}>

        {/* Page header */}
        {(() => {
          const maxAccounts = (userPlan === 'team' || userPlan === 'enterprise') ? Infinity : 3
          const atLimit = accounts.length >= maxAccounts
          return (
            <>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 12, marginBottom: atLimit ? 16 : 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em' }}>
                  Cloud Accounts
                  <span style={{ fontSize: 13, fontWeight: 400, color: '#6b7280', marginLeft: 12 }}>
                    {accounts.length}{maxAccounts === Infinity ? '' : `/${maxAccounts}`}
                  </span>
                </h1>
                <button
                  onClick={() => !atLimit && navigate('/dashboard/connect')}
                  disabled={atLimit}
                  style={{
                    background: atLimit ? '#1a1a18' : '#3B82F6',
                    color: atLimit ? '#555552' : 'white',
                    border: atLimit ? '1px solid #2a2a28' : 'none',
                    borderRadius: 6, padding: '10px 18px', fontSize: 14, fontWeight: 600,
                    cursor: atLimit ? 'not-allowed' : 'pointer',
                    transition: 'background 150ms', width: isMobile ? '100%' : undefined,
                  }}
                  onMouseEnter={e => { if (!atLimit) e.currentTarget.style.background = '#2563EB' }}
                  onMouseLeave={e => { if (!atLimit) e.currentTarget.style.background = '#3B82F6' }}
                >
                  Connect New Account
                </button>
              </div>

              {atLimit && userPlan === 'standard' && (
                <div style={{
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 8, padding: '14px 20px', marginBottom: 24,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: 14, color: '#9CA3AF' }}>
                    You've reached the 3-account limit on the Standard plan.
                  </span>
                  <a href="/dashboard/billing" style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Upgrade to Team →
                  </a>
                </div>
              )}
            </>
          )
        })()}

        {/* Empty state */}
        {accounts.length === 0 ? (
          <div style={{
            background: '#1a1a18', border: '1px solid #2a2a28',
            borderRadius: 8, padding: 48, textAlign: 'center',
          }}>
            <span style={{ fontSize: 32, marginBottom: 12, display: 'block' }}>☁</span>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#F5F4F0', margin: '0 0 8px' }}>
              No cloud accounts connected
            </p>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
              Connect your first cloud account to start finding savings.
            </p>
            <button
              onClick={() => navigate('/dashboard/connect')}
              style={{
                background: '#3B82F6', color: '#fff', border: 'none',
                borderRadius: 6, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Connect Cloud Account →
            </button>
          </div>
        ) : (
          <div>
            {accounts.map(account => (
              <div key={account.id} style={{
                background: '#1a1a18', border: '1px solid #2a2a28',
                borderRadius: 8, padding: isMobile ? 16 : '20px 24px', marginBottom: 12,
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between' }}>
                  {/* Left: account info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, width: '100%' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F4F0' }}>
                      {account.account_name}
                    </span>
                    <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap', wordBreak: isMobile ? 'break-all' : undefined, maxWidth: isMobile ? '100%' : 420 }}>
                      {account.role_arn}
                    </span>
                    <span style={{ fontSize: 12, color: '#555552', marginTop: 6 }}>
                      {extractAccountId(account.role_arn) && (
                        <span>Account ID: {extractAccountId(account.role_arn)} · </span>
                      )}
                      Connected: {formatDate(account.created_at)}
                      {account.last_audit_at
                        ? ' · Last audit: ' + formatDate(account.last_audit_at)
                        : ' · No audit run yet'}
                    </span>
                  </div>

                  {/* Right: actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: isMobile ? 'wrap' : undefined, marginLeft: isMobile ? 0 : 16, marginTop: isMobile ? 12 : 0 }}>
                    <span style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                      Connected
                    </span>

                    <button
                      onClick={() => navigate('/dashboard')}
                      style={{ background: 'none', border: '1px solid #2a2a28', color: '#F5F4F0', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', transition: 'border-color 150ms' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a38'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a28'}
                    >
                      Run Audit
                    </button>

                    <button
                      onClick={() => setExpandedPrefs(prev => ({ ...prev, [account.id]: !prev[account.id] }))}
                      style={{ background: 'none', border: '1px solid #2a2a28', color: expandedPrefs[account.id] ? '#3B82F6' : '#6b7280', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', transition: 'border-color 150ms, color 150ms' }}
                      title="Scan Preferences"
                    >
                      ⚙ Prefs
                    </button>

                    {confirmingDisconnect === account.id ? (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#ef4444' }}>Remove?</span>
                        <button onClick={() => handleDisconnect(account.id)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer', marginLeft: 8 }}>
                          Yes
                        </button>
                        <button onClick={() => setConfirmingDisconnect(null)} style={{ background: 'none', border: '1px solid #2a2a28', color: '#6b7280', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer', marginLeft: 6 }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingDisconnect(account.id)}
                        style={{ background: 'none', border: '1px solid #2a2a28', color: '#6b7280', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', transition: 'border-color 150ms, color 150ms' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a28'; e.currentTarget.style.color = '#6b7280' }}
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible scan preferences panel */}
                {expandedPrefs[account.id] && (
                  <div style={{ borderTop: '1px solid #2a2a28', marginTop: 16, paddingTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F4F0', marginBottom: 4 }}>Scan Preferences</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Customize which regions and services Vaultix scans for this account.</div>

                    {/* Regions */}
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.06em', marginBottom: 8, textTransform: 'uppercase' }}>Regions</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                      {ALL_REGIONS.map(region => {
                        const selected = accountPrefs[account.id]?.regions?.includes(region)
                        return (
                          <button key={region} onClick={() => {
                            const current = accountPrefs[account.id]?.regions || []
                            const updated = current.includes(region) ? current.filter(r => r !== region) : [...current, region]
                            setAccountPrefs(prev => ({ ...prev, [account.id]: { ...prev[account.id], regions: updated } }))
                          }}
                            style={{ background: selected ? 'rgba(59,130,246,0.15)' : '#111110', border: `1px solid ${selected ? '#3B82F6' : '#2a2a28'}`, color: selected ? '#3B82F6' : '#6b7280', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: selected ? 500 : 400 }}>
                            {region}
                          </button>
                        )
                      })}
                    </div>

                    {/* Services */}
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.06em', marginBottom: 8, textTransform: 'uppercase' }}>Services</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                      {ALL_SERVICES.map(service => {
                        const selected = accountPrefs[account.id]?.services?.includes(service)
                        return (
                          <button key={service} onClick={() => {
                            const current = accountPrefs[account.id]?.services || []
                            const updated = current.includes(service) ? current.filter(s => s !== service) : [...current, service]
                            setAccountPrefs(prev => ({ ...prev, [account.id]: { ...prev[account.id], services: updated } }))
                          }}
                            style={{ background: selected ? 'rgba(59,130,246,0.15)' : '#111110', border: `1px solid ${selected ? '#3B82F6' : '#2a2a28'}`, color: selected ? '#3B82F6' : '#6b7280', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: selected ? 500 : 400 }}>
                            {service}
                          </button>
                        )
                      })}
                    </div>

                    {/* Save */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        onClick={async () => {
                          await supabase.from('aws_accounts').update({ scan_preferences: accountPrefs[account.id] }).eq('id', account.id).eq('user_id', userId)
                          setPrefsSaved(prev => ({ ...prev, [account.id]: true }))
                          setTimeout(() => setPrefsSaved(prev => ({ ...prev, [account.id]: false })), 2000)
                        }}
                        style={{ background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Save Preferences
                      </button>
                      {prefsSaved[account.id] && <span style={{ color: '#22c55e', fontSize: 13 }}>Saved! ✓</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
