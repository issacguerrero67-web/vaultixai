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

const BACKEND_URL = 'https://vaultixai-production.up.railway.app'

const LABEL_STYLE = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: '#6b7280', marginBottom: 12, textTransform: 'uppercase',
}

const CARD_STYLE = {
  background: '#1a1a18', border: '1px solid #2a2a28',
  borderRadius: 8, padding: 24, marginBottom: 20,
}

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
        background: checked ? '#3B82F6' : '#2a2a28',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        border: '1px solid ' + (checked ? '#3B82F6' : '#444'),
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: checked ? 22 : 2,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  // Auth
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [sessionToken, setSessionToken] = useState('')

  // Profile
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState('')

  // AWS Accounts
  const [awsAccounts, setAwsAccounts] = useState([])
  const [disconnectingId, setDisconnectingId] = useState(null)
  const [confirmDisconnectId, setConfirmDisconnectId] = useState(null)
  const [disconnectError, setDisconnectError] = useState('')

  // Notifications
  const [notifications, setNotifications] = useState({
    audit_complete: true, monthly_summary: true, billing_alerts: true,
  })
  const [notifSaved, setNotifSaved] = useState(false)

  // Developer settings
  const [devExpanded, setDevExpanded] = useState(false)
  const [apiKeys, setApiKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState(null)
  const [showKey, setShowKey] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSaved, setWebhookSaved] = useState(false)

  // Danger zone
  const [showDangerZone, setShowDangerZone] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState('')
  const [disconnectAllConfirm, setDisconnectAllConfirm] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }

      setUserEmail(session.user.email)
      setUserId(session.user.id)
      setSessionToken(session.access_token)

      const [profileRes, accountsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('aws_accounts').select('id, account_name, role_arn, created_at').eq('user_id', session.user.id),
      ])

      const prof = profileRes.data
      if (prof) {
        setProfile(prof)
        setDisplayName(prof.full_name ?? '')
        if (prof.notification_preferences) setNotifications(prof.notification_preferences)
        if (prof.webhook_url) setWebhookUrl(prof.webhook_url)
      }
      if (accountsRes.data) setAwsAccounts(accountsRes.data)

      try {
        const keysRes = await fetch(`${BACKEND_URL}/api/keys`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
        const keysData = await keysRes.json()
        setApiKeys(keysData.keys || [])
      } catch (err) {
        console.error('Failed to fetch API keys:', err)
      }

      setLoading(false)
    }
    init()
  }, [navigate])

  async function handleSaveName() {
    if (!displayName.trim()) { setNameError('Display name cannot be empty.'); return }
    setSavingName(true); setNameError(''); setNameSaved(false)
    const { error } = await supabase.from('profiles').update({ full_name: displayName.trim() }).eq('id', userId)
    setSavingName(false)
    if (error) { setNameError('Failed to save. Please try again.') }
    else { setNameSaved(true); setTimeout(() => setNameSaved(false), 3000) }
  }

  async function handleDisconnect(accountId) {
    setDisconnectingId(accountId); setDisconnectError('')
    const { error } = await supabase.from('aws_accounts').delete().eq('id', accountId).eq('user_id', userId)
    if (error) { setDisconnectError('Failed to disconnect account. Please try again.'); setDisconnectingId(null) }
    else { setAwsAccounts(prev => prev.filter(a => a.id !== accountId)); setDisconnectingId(null); setConfirmDisconnectId(null) }
  }

  async function handleDisconnectAll() {
    await supabase.from('aws_accounts').delete().eq('user_id', userId)
    setAwsAccounts([])
    setDisconnectAllConfirm(false)
  }

  async function handleSaveNotifications() {
    await supabase.from('profiles').update({ notification_preferences: notifications }).eq('id', userId)
    setNotifSaved(true); setTimeout(() => setNotifSaved(false), 3000)
  }

  async function handleGenerateKey() {
    if (!newKeyName.trim()) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/keys/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await res.json()
      if (data.key) {
        setGeneratedKey(data)
        setShowKey(false)
        setNewKeyName('')
        setApiKeys(prev => [{ id: data.id, name: data.name, key_preview: data.preview, created_at: data.created_at, last_used_at: null }, ...prev])
      }
    } catch (err) {
      console.error('Failed to generate key:', err)
    }
  }

  async function handleRevokeKey(keyId) {
    try {
      await fetch(`${BACKEND_URL}/api/keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      })
      setApiKeys(prev => prev.filter(k => k.id !== keyId))
      if (generatedKey?.id === keyId) setGeneratedKey(null)
    } catch (err) {
      console.error('Failed to revoke key:', err)
    }
  }

  async function handleSaveWebhook() {
    await supabase.from('profiles').update({ webhook_url: webhookUrl }).eq('id', userId)
    setWebhookSaved(true); setTimeout(() => setWebhookSaved(false), 3000)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "'Geist', 'Inter', system-ui, sans-serif", backgroundColor: '#111110', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#666662', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Geist', 'Inter', system-ui, sans-serif", backgroundColor: '#111110', color: '#F5F4F0', minHeight: '100vh', display: 'flex', overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 240, flexShrink: 0, backgroundColor: '#0D0D0D', borderRight: '1px solid #1E1E1C', display: isMobile ? 'none' : 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1E1E1C' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3B82F6', boxShadow: '0 0 8px rgba(59,130,246,0.8), 0 0 16px rgba(59,130,246,0.4)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em', color: '#F5F4F0' }}>Vaultix AI</span>
          </Link>
        </div>
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ label, icon, path }) => {
            const active = location.pathname === path
            return (
              <Link key={path} to={path} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', fontSize: 14, fontWeight: active ? 500 : 400, color: active ? '#3B82F6' : '#888884', textDecoration: 'none', borderLeft: active ? '2px solid #3B82F6' : '2px solid transparent', backgroundColor: active ? 'rgba(59,130,246,0.06)' : 'transparent', transition: 'color 150ms, background-color 150ms' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#F5F4F0'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#888884'; e.currentTarget.style.backgroundColor = 'transparent' } }}>
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1E1E1C' }}>
          {displayName ? (
            <>
              <div style={{ fontSize: 13, color: '#F5F4F0', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#666662', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
          )}
          <button onClick={handleSignOut} disabled={signingOut}
            style={{ width: '100%', backgroundColor: 'transparent', border: '1px solid #1E1E1C', borderRadius: 6, color: '#666662', fontSize: 13, fontWeight: 500, padding: '7px 0', cursor: signingOut ? 'not-allowed' : 'pointer', transition: 'border-color 150ms, color 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B3B38'; e.currentTarget.style.color = '#F5F4F0' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1C'; e.currentTarget.style.color = '#666662' }}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ── DELETE ACCOUNT MODAL ── */}
      {showDangerZone && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowDangerZone(false); setConfirmDelete('') } }}>
          <div style={{ background: '#1a1a18', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 32, width: '100%', maxWidth: 440, margin: '0 16px', position: 'relative' }}>
            <button onClick={() => { setShowDangerZone(false); setConfirmDelete('') }}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}>×</button>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', marginBottom: 12 }}>Delete Account</h2>
            <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 20, lineHeight: 1.6 }}>
              This will permanently delete your account, all AWS connections, and all audit history. <strong style={{ color: '#F5F4F0' }}>This cannot be undone.</strong>
            </p>
            <input
              type="text"
              placeholder='Type "DELETE" to confirm'
              value={confirmDelete}
              onChange={e => setConfirmDelete(e.target.value)}
              style={{ width: '100%', background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '10px 14px', color: '#F5F4F0', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowDangerZone(false); setConfirmDelete('') }}
                style={{ flex: 1, background: 'none', border: '1px solid #2a2a28', borderRadius: 6, color: '#6b7280', fontSize: 14, fontWeight: 600, padding: '10px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                disabled={confirmDelete !== 'DELETE'}
                onClick={async () => {
                  await supabase.auth.signOut()
                  navigate('/login')
                }}
                style={{ flex: 1, background: confirmDelete === 'DELETE' ? '#ef4444' : '#1a1a18', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: confirmDelete === 'DELETE' ? '#fff' : '#555', fontSize: 14, fontWeight: 600, padding: '10px', cursor: confirmDelete === 'DELETE' ? 'pointer' : 'not-allowed', transition: 'background 150ms' }}>
                Delete Account
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#555552', marginTop: 12, textAlign: 'center' }}>
              Contact <a href="mailto:support@vaultixai.app" style={{ color: '#3B82F6' }}>support@vaultixai.app</a> to complete account deletion.
            </p>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <main style={{ marginLeft: isMobile ? 0 : 240, flex: 1, padding: isMobile ? '16px 16px 70px' : 32, maxWidth: isMobile ? '100%' : 'calc(720px + 240px)', minWidth: 0, overflowX: 'hidden' }}>
        <div style={{ maxWidth: 720 }}>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em' }}>Settings</h1>
            <p style={{ fontSize: 13, color: '#666662', margin: '6px 0 0' }}>Manage your account, notifications, and preferences.</p>
          </div>

          {/* ── SECTION 1: PROFILE ── */}
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>Profile</div>

            {/* Display name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#888884', marginBottom: 6, fontWeight: 500 }}>Display name</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
                  placeholder="Your name"
                  style={{ flex: 1, background: '#111110', border: '1px solid #2A2A28', borderRadius: 8, color: '#F5F4F0', fontSize: 13, padding: '9px 12px', outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#3B82F6' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#2A2A28' }} />
                <button onClick={handleSaveName} disabled={savingName}
                  style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: savingName ? 'not-allowed' : 'pointer', opacity: savingName ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                  {savingName ? 'Saving…' : 'Save'}
                </button>
              </div>
              {nameError && <p style={{ fontSize: 12, color: '#EF4444', margin: '6px 0 0' }}>{nameError}</p>}
              {nameSaved && <p style={{ fontSize: 12, color: '#22C55E', margin: '6px 0 0' }}>Name saved.</p>}
            </div>

            {/* Email + plan badge */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#888884', marginBottom: 6, fontWeight: 500 }}>Email</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <input type="email" value={userEmail} readOnly
                  style={{ flex: 1, minWidth: 180, background: '#0D0D0D', border: '1px solid #1E1E1C', borderRadius: 8, color: '#666662', fontSize: 13, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', cursor: 'default' }} />
                {profile?.plan && (
                  <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3B82F6', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {profile.plan === 'team' ? 'Team Plan' : profile.plan === 'enterprise' ? 'Enterprise' : 'Standard Plan'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: '#3B3B38', margin: '5px 0 0' }}>Email cannot be changed here. Contact support if needed.</p>
            </div>
          </div>

          {/* ── SECTION 2: CONNECTED AWS ACCOUNTS ── */}
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>Connected AWS Accounts</div>
            {awsAccounts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: 13, color: '#666662', margin: '0 0 12px' }}>No AWS accounts connected yet.</p>
                <Link to="/dashboard/connect" style={{ display: 'inline-block', background: '#3B82F6', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 8, textDecoration: 'none' }}>
                  Connect AWS Account →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {awsAccounts.map(account => (
                  <div key={account.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#111110', border: '1px solid #1E1E1C', borderRadius: 8, gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F4F0', marginBottom: 2 }}>{account.account_name}</div>
                      <div style={{ fontSize: 11, color: '#3B3B38', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.role_arn}</div>
                    </div>
                    {confirmDisconnectId === account.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: 6 }}>
                        <span style={{ fontSize: 13, color: '#ef4444' }}>Remove?</span>
                        <button onClick={() => handleDisconnect(account.id)} disabled={disconnectingId === account.id}
                          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: disconnectingId === account.id ? 'not-allowed' : 'pointer' }}>
                          {disconnectingId === account.id ? 'Removing…' : 'Yes'}
                        </button>
                        <button onClick={() => setConfirmDisconnectId(null)}
                          style={{ background: 'none', border: '1px solid #2a2a28', color: '#6b7280', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setConfirmDisconnectId(account.id); setDisconnectError('') }}
                        style={{ background: 'transparent', border: '1px solid #2A2A28', borderRadius: 6, color: '#888884', fontSize: 12, fontWeight: 500, padding: '6px 12px', cursor: 'pointer', flexShrink: 0, transition: 'border-color 150ms, color 150ms' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A28'; e.currentTarget.style.color = '#888884' }}>
                        Disconnect
                      </button>
                    )}
                  </div>
                ))}
                {disconnectError && <p style={{ fontSize: 12, color: '#EF4444', margin: '4px 0 0' }}>{disconnectError}</p>}
              </div>
            )}
          </div>

          {/* ── SECTION 3: NOTIFICATIONS ── */}
          <div style={CARD_STYLE}>
            <div style={LABEL_STYLE}>Notifications</div>
            {[
              { key: 'audit_complete', label: 'Audit Complete Emails', desc: 'Get notified when an audit finishes' },
              { key: 'monthly_summary', label: 'Monthly Savings Summary', desc: 'Monthly email with your savings progress' },
              { key: 'billing_alerts', label: 'Billing Alerts', desc: 'Alerts for payment issues or plan changes' },
            ].map(({ key, label, desc }, i, arr) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < arr.length - 1 ? 14 : 0, marginBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? '1px solid #1e1e1c' : 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#F5F4F0', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{desc}</div>
                </div>
                <Toggle checked={notifications[key]} onChange={val => setNotifications(p => ({ ...p, [key]: val }))} />
              </div>
            ))}
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={handleSaveNotifications}
                style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Save Notifications
              </button>
              {notifSaved && <span style={{ fontSize: 12, color: '#22c55e' }}>Saved!</span>}
            </div>
          </div>

          {/* ── SECTION 4: DEVELOPER SETTINGS (collapsible) ── */}
          <div style={{ marginBottom: 20 }}>
            <div
              onClick={() => setDevExpanded(!devExpanded)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '16px 24px', background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: devExpanded ? '8px 8px 0 0' : 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F4F0' }}>Developer Settings</span>
              <span style={{ color: '#6b7280', fontSize: 12, transition: 'transform 150ms' }}>{devExpanded ? '▲' : '▼'}</span>
            </div>

            {devExpanded && (
              <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 24 }}>

                {/* A. API Keys */}
                <div style={LABEL_STYLE}>API Keys</div>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, marginTop: 0 }}>Use API keys to access your Vaultix data programmatically.</p>

                <div style={{ display: 'flex', gap: 10, marginBottom: generatedKey ? 16 : 20 }}>
                  <input type="text" placeholder="Key name (e.g. Production)" value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleGenerateKey() }}
                    style={{ background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '9px 14px', color: '#F5F4F0', fontSize: 14, flex: 1, outline: 'none' }} />
                  <button onClick={handleGenerateKey}
                    style={{ background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Generate Key
                  </button>
                </div>

                {generatedKey && (
                  <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                    <div style={{ color: '#22c55e', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>✓ Key generated — save it now, it won't be shown again.</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#F5F4F0', background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '8px 12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {showKey ? generatedKey.key : '•'.repeat(40)}
                      </span>
                      <button onClick={() => setShowKey(!showKey)}
                        style={{ background: 'none', border: '1px solid #2a2a28', borderRadius: 6, padding: '8px 12px', color: '#6b7280', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>
                        {showKey ? '👁' : '👁‍🗨'}
                      </button>
                      <button onClick={() => navigator.clipboard.writeText(generatedKey.key)}
                        style={{ background: 'none', border: '1px solid #2a2a28', borderRadius: 6, padding: '8px 12px', color: '#3B82F6', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {apiKeys.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {apiKeys.map((key, i) => (
                      <div key={key.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < apiKeys.length - 1 ? '1px solid #1e1e1c' : 'none' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#F5F4F0', marginBottom: 2 }}>{key.name}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{key.key_preview}</div>
                          <div style={{ fontSize: 11, color: '#555552', marginTop: 2 }}>
                            Created {new Date(key.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {key.last_used_at ? ` · Last used ${new Date(key.last_used_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ' · Never used'}
                          </div>
                        </div>
                        <button onClick={() => handleRevokeKey(key.id)}
                          style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* B. Webhook URL */}
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #2a2a28' }}>
                  <div style={LABEL_STYLE}>Webhook URL</div>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12, marginTop: 0 }}>Receive notifications in Slack or Teams when audits complete.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="url" placeholder="https://hooks.slack.com/..." value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      style={{ background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '9px 14px', color: '#F5F4F0', fontSize: 14, flex: 1, outline: 'none' }} />
                    <button onClick={handleSaveWebhook}
                      style={{ background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Save Webhook
                    </button>
                  </div>
                  {webhookSaved && <span style={{ fontSize: 12, color: '#22c55e', marginTop: 8, display: 'block' }}>Saved!</span>}
                </div>

                {/* C. Account Info */}
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #2a2a28' }}>
                  <div style={LABEL_STYLE}>Account Info</div>
                  {[
                    { label: 'User ID', value: profile?.id, mono: true },
                    { label: 'Account Created', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—', mono: false },
                  ].map(({ label, value, mono }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e1e1c' }}>
                      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: mono ? 'monospace' : 'inherit', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                        {mono && value && (
                          <button onClick={() => navigator.clipboard.writeText(value)}
                            style={{ background: 'none', border: '1px solid #2a2a28', borderRadius: 4, padding: '3px 8px', color: '#6b7280', fontSize: 11, cursor: 'pointer' }}>
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* D. Danger Zone */}
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ ...LABEL_STYLE, color: '#ef4444' }}>Danger Zone</div>

                  {/* Disconnect all */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#F5F4F0', marginBottom: 3 }}>Disconnect all AWS accounts</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Removes all connected accounts. Audit history is preserved.</div>
                    </div>
                    {disconnectAllConfirm ? (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={handleDisconnectAll}
                          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>
                          Confirm
                        </button>
                        <button onClick={() => setDisconnectAllConfirm(false)}
                          style={{ background: 'none', border: '1px solid #2a2a28', color: '#6b7280', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDisconnectAllConfirm(true)}
                        style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                        Disconnect All
                      </button>
                    )}
                  </div>

                  {/* Delete account */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#F5F4F0', marginBottom: 3 }}>Delete your account</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Permanently deletes your account and all data. Cannot be undone.</div>
                    </div>
                    <button onClick={() => { setShowDangerZone(true); setConfirmDelete('') }}
                      style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                      Delete Account
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </main>

      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1a1a18', borderTop: '1px solid #2a2a28', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 0 12px', zIndex: 1000 }}>
          {[
            { label: 'Dashboard', path: '/dashboard', icon: '⊡' },
            { label: 'Reports',   path: '/dashboard/reports', icon: '≡' },
            { label: 'Autopilot', path: '/dashboard/autopilot', icon: '✦' },
            { label: 'Accounts',  path: '/dashboard/accounts', icon: '⊕' },
            { label: 'Settings',  path: '/dashboard/settings', icon: '⊙' },
          ].map(({ label, path, icon }) => {
            const isActive = window.location.pathname === path
            return (
              <a key={path} href={path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', color: isActive ? '#3B82F6' : '#6b7280', fontSize: 10, fontWeight: isActive ? 600 : 400, minWidth: 48 }}>
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
