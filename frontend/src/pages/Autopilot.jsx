import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const geistFontLink = document.createElement('link')
geistFontLink.rel = 'stylesheet'
geistFontLink.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;900&display=swap'
if (!document.head.querySelector('[href*="Geist"]')) {
  document.head.appendChild(geistFontLink)
}

const BACKEND_URL = 'https://vaultixai-production.up.railway.app'

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: '⊡', path: '/dashboard' },
  { label: 'Reports',      icon: '≡', path: '/dashboard/reports' },
  { label: 'Billing',      icon: '◇', path: '/dashboard/billing' },
  { label: 'AWS Accounts', icon: '⊕', path: '/dashboard/accounts' },
  { label: 'Autopilot',    icon: '⚡', path: '/dashboard/autopilot' },
  { label: 'Settings',     icon: '⊙', path: '/dashboard/settings' },
]

const ACTION_TYPE_LABELS = {
  delete_ebs_volume:  '💾 EBS Volume',
  release_elastic_ip: '🌐 Elastic IP',
  stop_ec2_instance:  '🖥 EC2 Instance',
  delete_snapshot:    '📸 Snapshot',
}

const RISK_STYLES = {
  safe:        { background: 'rgba(34,197,94,0.1)',  border: '1px solid rgba(34,197,94,0.2)',  color: '#22c55e' },
  caution:     { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' },
  irreversible:{ background: 'rgba(239,68,68,0.1)',  border: '1px solid rgba(239,68,68,0.2)',  color: '#ef4444' },
}

const STATUS_STYLES = {
  pending:     { background: '#2a2a28', color: '#6b7280' },
  approved:    { background: 'rgba(59,130,246,0.15)',  color: '#3B82F6' },
  executing:   { background: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  complete:    { background: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
  failed:      { background: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  skipped:     { background: '#2a2a28', color: '#444' },
  rolled_back: { background: '#2a2a28', color: '#6b7280' },
}

const STATUS_LABELS = {
  pending:     'PENDING',
  approved:    'APPROVED',
  executing:   'EXECUTING...',
  complete:    'COMPLETE',
  failed:      'FAILED',
  skipped:     'SKIPPED',
  rolled_back: 'ROLLED BACK',
}

export default function Autopilot() {
  const navigate = useNavigate()
  const location = useLocation()

  const [view, setView] = useState('loading')
  const [actions, setActions] = useState([])
  const [executing, setExecuting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [showConfirmAll, setShowConfirmAll] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)
  const [totalSavings, setTotalSavings] = useState(0)
  const [awsAccount, setAwsAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  const [setupStep, setSetupStep] = useState(1)
  const [autopilotArn, setAutopilotArn] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')

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

      const [profileRes, accountsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, plan').eq('id', session.user.id).single(),
        supabase.from('aws_accounts').select('id, account_name, role_arn, autopilot_role_arn').eq('user_id', session.user.id).limit(1),
      ])

      if (profileRes.data?.full_name) setDisplayName(profileRes.data.full_name)

      const plan = profileRes.data?.plan
      if (plan !== 'team' && plan !== 'enterprise') {
        setView('upgrade')
        setLoading(false)
        return
      }

      const account = accountsRes.data?.[0] ?? null
      setAwsAccount(account)

      if (!account || !account.autopilot_role_arn) {
        setView('setup')
        setLoading(false)
        return
      }

      await loadActions(session.access_token, account.id)
      setView('active')
      setLoading(false)
    }
    init()
  }, [navigate])

  async function loadActions(token, accountId) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/autopilot/status/${accountId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const list = data.actions ?? []
        setActions(list)
        setCompletedCount(list.filter(a => a.status === 'complete').length)
        setTotalSavings(list.reduce((sum, a) => sum + (a.estimated_monthly_savings || 0), 0))
      }
    } catch (e) {
      console.error('Failed to load actions:', e)
    }
  }

  async function refreshActions() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session && awsAccount) {
      await loadActions(session.access_token, awsAccount.id)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function handleVerifyRole() {
    if (!autopilotArn.trim()) return
    setVerifying(true)
    setVerifyError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: updateError } = await supabase
        .from('aws_accounts')
        .update({ autopilot_role_arn: autopilotArn.trim() })
        .eq('id', awsAccount.id)
        .eq('user_id', user.id)

      if (updateError) { setVerifyError('Failed to save role ARN. Try again.'); setVerifying(false); return }

      const updated = { ...awsAccount, autopilot_role_arn: autopilotArn.trim() }
      setAwsAccount(updated)

      const { data: { session } } = await supabase.auth.getSession()
      await loadActions(session.access_token, awsAccount.id)
      setView('active')
    } catch (e) {
      setVerifyError('Something went wrong. Try again.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleScan() {
    setScanning(true)
    setScanError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND_URL}/api/autopilot/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ aws_account_id: awsAccount.id }),
      })
      if (!res.ok) { const d = await res.json(); setScanError(d.error || 'Scan failed'); return }
      await refreshActions()
    } catch (e) {
      setScanError('Scan failed. Try again.')
    } finally {
      setScanning(false)
    }
  }

  async function handleApprove(actionId) {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND_URL}/api/autopilot/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ action_id: actionId }),
    })
    await refreshActions()
  }

  async function handleSkip(actionId) {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND_URL}/api/autopilot/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ action_id: actionId }),
    })
    await refreshActions()
  }

  async function handleExecuteOne(actionId) {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND_URL}/api/autopilot/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ aws_account_id: awsAccount.id, action_id: actionId }),
    })
    await refreshActions()
  }

  async function handleExecuteAll() {
    setExecuting(true)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND_URL}/api/autopilot/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ aws_account_id: awsAccount.id }),
    })
    await refreshActions()
    setExecuting(false)
  }

  async function handleApproveAll() {
    if (confirmText !== 'CONFIRM') return
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND_URL}/api/autopilot/approve-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ aws_account_id: awsAccount.id, confirm: 'CONFIRM' }),
    })
    setShowConfirmAll(false)
    setConfirmText('')
    await refreshActions()
  }

  async function handleRollback(actionId) {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${BACKEND_URL}/api/autopilot/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ action_id: actionId }),
    })
    await refreshActions()
  }

  const sortOrder = { pending: 0, approved: 1, executing: 2, complete: 3, failed: 4, skipped: 5, rolled_back: 6 }
  const sortedActions = [...actions].sort((a, b) => (sortOrder[a.status] ?? 99) - (sortOrder[b.status] ?? 99))

  const pendingCount  = actions.filter(a => a.status === 'pending').length
  const approvedCount = actions.filter(a => a.status === 'approved').length
  const doneCount     = actions.filter(a => a.status === 'complete').length
  const totalPendingSavings = actions
    .filter(a => a.status === 'pending')
    .reduce((s, a) => s + (a.estimated_monthly_savings || 0), 0)

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
      <main style={{ marginLeft: isMobile ? 0 : 240, flex: 1, padding: isMobile ? '16px 16px 100px' : '32px', minWidth: 0, overflowX: 'hidden' }}>

        {/* ── UPGRADE VIEW ── */}
        {view === 'upgrade' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{
              background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 12,
              padding: 40, textAlign: 'center', maxWidth: 480, width: '100%',
            }}>
              <span style={{ fontSize: 40, marginBottom: 16, display: 'block' }}>⚡</span>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F4F0', margin: '0 0 8px' }}>Autopilot</h1>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 24, margin: '0 0 24px' }}>
                Let Vaultix automatically execute approved fixes in your AWS account. You only pay 35% of verified savings.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, textAlign: 'left' }}>
                {[
                  ['✅', 'Approve specific actions before anything runs'],
                  ['✅', 'Snapshots created before any deletion'],
                  ['✅', 'One-click rollback on completed actions'],
                  ['✅', 'Full audit log of every change'],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span style={{ fontSize: 14, color: '#9ca3af' }}>{text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/dashboard/billing')}
                style={{
                  background: '#3B82F6', color: 'white', border: 'none', borderRadius: 8,
                  padding: '14px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#2563EB'}
                onMouseLeave={e => e.currentTarget.style.background = '#3B82F6'}
              >
                Upgrade to Autopilot — 35% of savings
              </button>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12, margin: '12px 0 0' }}>
                No upfront cost. You only pay when we save you money.
              </p>
            </div>
          </div>
        )}

        {/* ── SETUP VIEW ── */}
        {view === 'setup' && (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
              {[1, 2].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: setupStep === n ? '#3B82F6' : setupStep > n ? 'rgba(34,197,94,0.2)' : '#2a2a28',
                    border: `1px solid ${setupStep === n ? '#3B82F6' : setupStep > n ? 'rgba(34,197,94,0.4)' : '#3a3a38'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600,
                    color: setupStep === n ? 'white' : setupStep > n ? '#22c55e' : '#6b7280',
                  }}>
                    {setupStep > n ? '✓' : n}
                  </div>
                  <span style={{ fontSize: 13, color: setupStep === n ? '#F5F4F0' : '#6b7280', fontWeight: setupStep === n ? 500 : 400 }}>
                    {n === 1 ? 'Deploy Role' : 'Verify'}
                  </span>
                  {n < 2 && <span style={{ color: '#3a3a38', marginLeft: 8 }}>→</span>}
                </div>
              ))}
            </div>

            <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 12, padding: 32 }}>
              {setupStep === 1 ? (
                <>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F4F0', margin: '0 0 8px' }}>Deploy Autopilot Role</h2>
                  <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
                    This CloudFormation template grants Vaultix write access to specific safe resources only.
                  </p>

                  <div style={{
                    background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: 8, padding: 16, marginBottom: 24,
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#F5F4F0', margin: '0 0 10px' }}>Permissions granted:</p>
                    {[
                      ['✅', 'Stop idle EC2 instances'],
                      ['✅', 'Delete unattached EBS volumes (snapshot first)'],
                      ['✅', 'Release unused Elastic IPs'],
                      ['❌', 'Never touches databases, security groups, or running instances'],
                    ].map(([icon, text]) => (
                      <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 14 }}>{icon}</span>
                        <span style={{ fontSize: 13, color: icon === '❌' ? '#ef4444' : '#9ca3af' }}>{text}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href="https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?templateURL=https://vaultixai-cloudformation-templates.s3.us-east-2.amazonaws.com/vaultix-autopilot-role.yaml&stackName=vaultix-autopilot-role"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block', background: '#3B82F6', color: 'white', textDecoration: 'none',
                      textAlign: 'center', borderRadius: 8, padding: '13px 24px',
                      fontSize: 14, fontWeight: 600, marginBottom: 16,
                    }}
                  >
                    Deploy CloudFormation Template →
                  </a>

                  <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', margin: '0 0 16px' }}>
                    Once deployed, click Next to verify
                  </p>

                  <button
                    onClick={() => setSetupStep(2)}
                    style={{
                      width: '100%', background: 'none', border: '1px solid #2a2a28',
                      color: '#F5F4F0', borderRadius: 8, padding: '12px 24px',
                      fontSize: 14, fontWeight: 500, cursor: 'pointer',
                      transition: 'border-color 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a38'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a28'}
                  >
                    Next →
                  </button>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F4F0', margin: '0 0 8px' }}>Verify Autopilot Role</h2>
                  <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
                    Paste the Role ARN from your CloudFormation stack outputs.
                  </p>

                  <input
                    type="text"
                    value={autopilotArn}
                    onChange={e => setAutopilotArn(e.target.value)}
                    placeholder="arn:aws:iam::123456789012:role/VaultixAutopilotRole"
                    style={{
                      width: '100%', background: '#111110', border: '1px solid #2a2a28',
                      borderRadius: 6, padding: '10px 14px', color: '#F5F4F0', fontSize: 14,
                      marginBottom: 12, boxSizing: 'border-box', outline: 'none',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
                    onBlur={e => e.currentTarget.style.borderColor = '#2a2a28'}
                  />

                  {verifyError && (
                    <p style={{ fontSize: 13, color: '#ef4444', margin: '0 0 12px' }}>{verifyError}</p>
                  )}

                  <button
                    onClick={handleVerifyRole}
                    disabled={verifying || !autopilotArn.trim()}
                    style={{
                      width: '100%', background: autopilotArn.trim() ? '#3B82F6' : '#2a2a28',
                      color: 'white', border: 'none', borderRadius: 8,
                      padding: '13px 24px', fontSize: 14, fontWeight: 600,
                      cursor: verifying || !autopilotArn.trim() ? 'not-allowed' : 'pointer',
                      opacity: verifying ? 0.7 : 1, marginBottom: 12,
                    }}
                  >
                    {verifying ? 'Verifying…' : 'Verify & Activate'}
                  </button>

                  <button
                    onClick={() => setSetupStep(1)}
                    style={{
                      width: '100%', background: 'none', border: 'none',
                      color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: '8px 0',
                    }}
                  >
                    ← Back
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── ACTIVE VIEW ── */}
        {view === 'active' && (
          <>
            {/* Page header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em' }}>
                Autopilot
              </h1>
              <button
                onClick={handleScan}
                disabled={scanning}
                style={{
                  background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6,
                  padding: '10px 18px', fontSize: 14, fontWeight: 600,
                  cursor: scanning ? 'not-allowed' : 'pointer', opacity: scanning ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!scanning) e.currentTarget.style.background = '#2563EB' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#3B82F6' }}
              >
                {scanning ? 'Scanning…' : 'Scan for Actions'}
              </button>
            </div>

            {scanError && (
              <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 16 }}>{scanError}</p>
            )}

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Pending Actions', value: pendingCount },
                { label: 'Approved', value: approvedCount },
                { label: 'Completed This Month', value: doneCount },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: '#0D0D0D', border: '1px solid #1E1E1C', borderRadius: 10, padding: '20px 24px' }}>
                  <div style={{ fontSize: 12, color: '#666662', fontWeight: 500, marginBottom: 10, letterSpacing: '0.02em' }}>{label}</div>
                  <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: '#F5F4F0', letterSpacing: '-0.03em' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Empty state */}
            {actions.length === 0 ? (
              <div style={{
                background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8,
                padding: 48, textAlign: 'center', marginTop: 24,
              }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>⚡</span>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#F5F4F0', margin: '0 0 8px' }}>No actions yet</p>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  Click 'Scan for Actions' to analyze your AWS account for automated fixes.
                </p>
              </div>
            ) : (
              <>
                {/* Approve All banner */}
                {pendingCount > 0 && (
                  <div style={{
                    background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: 8, padding: '16px 20px', marginBottom: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0,
                  }}>
                    <span style={{ fontSize: 14, color: '#F5F4F0' }}>
                      <strong>{pendingCount}</strong> action{pendingCount !== 1 ? 's' : ''} pending approval
                      {totalPendingSavings > 0 && ` — estimated savings: $${totalPendingSavings.toLocaleString()}/mo`}
                    </span>
                    <button
                      onClick={() => setShowConfirmAll(true)}
                      style={{
                        background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6,
                        padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        width: isMobile ? '100%' : undefined,
                      }}
                    >
                      Approve All
                    </button>
                  </div>
                )}

                {/* Action cards */}
                {sortedActions.map(action => (
                  <div key={action.id} style={{
                    background: '#1a1a18', border: '1px solid #2a2a28',
                    borderRadius: 8, padding: 20, marginBottom: 12,
                  }}>
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#F5F4F0' }}>
                          {ACTION_TYPE_LABELS[action.action_type] ?? action.action_type}
                        </span>
                        {action.risk_level && RISK_STYLES[action.risk_level] && (
                          <span style={{
                            ...RISK_STYLES[action.risk_level],
                            borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                          }}>
                            {action.risk_level.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {action.estimated_monthly_savings > 0 && (
                        <span style={{ color: '#3B82F6', fontWeight: 600, fontSize: 14 }}>
                          ${action.estimated_monthly_savings.toLocaleString()}/mo
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16, lineHeight: 1.5, margin: '0 0 16px' }}>
                      {action.description}
                    </p>

                    {/* Snapshot notice */}
                    {action.is_reversible && action.action_type === 'delete_ebs_volume' && (
                      <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, margin: '0 0 16px' }}>
                        ⚠ A snapshot will be created before deletion for recovery purposes.
                      </p>
                    )}

                    {/* Status + action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{
                        ...STATUS_STYLES[action.status] ?? STATUS_STYLES.pending,
                        borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      }}>
                        {STATUS_LABELS[action.status] ?? action.status.toUpperCase()}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {action.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(action.id)}
                              style={{
                                background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                                color: '#22c55e', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                              }}
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => handleSkip(action.id)}
                              style={{
                                background: 'none', border: '1px solid #2a2a28', color: '#6b7280',
                                borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                              }}
                            >
                              ❌ Skip
                            </button>
                          </>
                        )}
                        {action.status === 'approved' && (
                          <button
                            onClick={() => handleExecuteOne(action.id)}
                            style={{
                              background: '#3B82F6', color: 'white', border: 'none',
                              borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                            }}
                          >
                            ▶ Execute Now
                          </button>
                        )}
                        {action.status === 'complete' && action.is_reversible && (
                          <button
                            onClick={() => handleRollback(action.id)}
                            style={{
                              background: 'none', border: '1px solid #2a2a28', color: '#6b7280',
                              borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                            }}
                          >
                            ↩ Rollback
                          </button>
                        )}
                        {action.status === 'failed' && action.error_message && (
                          <span style={{ fontSize: 12, color: '#ef4444' }}>{action.error_message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Execute All Approved — fixed FAB */}
            {approvedCount > 0 && (
              <button
                onClick={handleExecuteAll}
                disabled={executing}
                style={{
                  position: 'fixed', bottom: isMobile ? 80 : 24, right: 24,
                  background: '#3B82F6', color: 'white', border: 'none', borderRadius: 8,
                  padding: '14px 24px', fontSize: 14, fontWeight: 600,
                  cursor: executing ? 'not-allowed' : 'pointer', opacity: executing ? 0.7 : 1,
                  boxShadow: '0 4px 20px rgba(59,130,246,0.4)', zIndex: 100,
                }}
              >
                {executing ? 'Executing…' : `▶ Execute ${approvedCount} Approved Action${approvedCount !== 1 ? 's' : ''}`}
              </button>
            )}
          </>
        )}
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
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
            { label: 'Autopilot', path: '/dashboard/autopilot', icon: '⚡' },
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

      {/* ── CONFIRM ALL MODAL ── */}
      {showConfirmAll && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) { setShowConfirmAll(false); setConfirmText('') } }}
        >
          <div style={{
            background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 12,
            padding: 32, maxWidth: 420, width: '100%',
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F4F0', margin: '0 0 16px' }}>
              Approve All Actions
            </h2>
            <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
              This will approve {pendingCount} action{pendingCount !== 1 ? 's' : ''} for execution. Type CONFIRM to proceed.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type CONFIRM"
              autoFocus
              style={{
                width: '100%', background: '#111110', border: '1px solid #2a2a28',
                borderRadius: 6, padding: '10px 14px', color: '#F5F4F0', fontSize: 14,
                marginBottom: 16, boxSizing: 'border-box', outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#3B82F6'}
              onBlur={e => e.currentTarget.style.borderColor = '#2a2a28'}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowConfirmAll(false); setConfirmText('') }}
                style={{
                  flex: 1, background: 'none', border: '1px solid #2a2a28', color: '#6b7280',
                  borderRadius: 8, padding: '11px 0', fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApproveAll}
                disabled={confirmText !== 'CONFIRM'}
                style={{
                  flex: 1, background: confirmText === 'CONFIRM' ? '#3B82F6' : '#2a2a28',
                  color: 'white', border: 'none', borderRadius: 8, padding: '11px 0',
                  fontSize: 14, fontWeight: 600,
                  cursor: confirmText === 'CONFIRM' ? 'pointer' : 'not-allowed',
                  opacity: confirmText === 'CONFIRM' ? 1 : 0.5,
                }}
              >
                Approve All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
