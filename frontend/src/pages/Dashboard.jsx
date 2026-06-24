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

function formatAuditDate(ts) {
  const d = new Date(ts)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  )
}

const SEVERITY_STYLES = {
  high:   { background: 'rgba(239,68,68,0.15)',  color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)'  },
  medium: { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
  low:    { background: 'rgba(34,197,94,0.15)',  color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)'  },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()

  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [runningAudit, setRunningAudit] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [auditError, setAuditError] = useState('')
  const [awsConnected, setAwsConnected] = useState(null)
  const [reportCount, setReportCount] = useState(0)
  const [latestReport, setLatestReport] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [showWelcome, setShowWelcome] = useState(
    () => localStorage.getItem('vaultix_welcome_dismissed') !== 'true'
  )
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

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

      const [accountsRes, reportsCountRes, latestReportRes, profileRes] = await Promise.all([
        supabase.from('aws_accounts').select('id').eq('user_id', session.user.id).limit(1),
        supabase.from('audit_reports').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase
          .from('audit_reports')
          .select('id, findings, total_savings, created_at, status')
          .eq('user_id', session.user.id)
          .eq('status', 'complete')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', session.user.id).single(),
      ])

      setAwsConnected(!!(accountsRes.data && accountsRes.data.length > 0))
      setReportCount(reportsCountRes.count ?? 0)
      setLatestReport(latestReportRes.data ?? null)
      if (profileRes.data?.full_name) setDisplayName(profileRes.data.full_name)
      setLoading(false)
    }
    init()
  }, [navigate])

  function dismissWelcome() {
    localStorage.setItem('vaultix_welcome_dismissed', 'true')
    setShowWelcome(false)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function runAudit() {
    setAuditError('')
    setRunningAudit(true)
    setElapsedSeconds(0)

    const { data: { session } } = await supabase.auth.getSession()

    const { data: accounts } = await supabase
      .from('aws_accounts')
      .select('id')
      .eq('user_id', session.user.id)
      .limit(1)

    if (!accounts || accounts.length === 0) {
      setAuditError('No AWS account connected. Connect your AWS account first.')
      setRunningAudit(false)
      return
    }

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/audit/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })
      const data = await res.json()
      if (res.ok) {
        navigate('/dashboard/reports')
      } else {
        console.error('Audit failed:', data.error)
      }
    } catch (err) {
      console.error('Audit error:', err)
    } finally {
      clearInterval(timer)
      setRunningAudit(false)
    }
  }

  // Derived data
  const findings = latestReport?.findings ?? []
  const topFindings = findings.slice(0, 5)

  const categoryTotals = findings.reduce((acc, f) => {
    if (f.estimatedMonthlySavings > 0) {
      acc[f.category] = (acc[f.category] || 0) + f.estimatedMonthlySavings
    }
    return acc
  }, {})
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])
  const maxSavings = sortedCategories[0]?.[1] || 1

  // Dynamic stat card values
  const totalSavings = latestReport ? '$' + (latestReport.total_savings || 0).toLocaleString() : '$0'
  const accountsConnected = awsConnected ? '1' : '0'
  const reportsGenerated = String(reportCount)
  const lastScan = latestReport ? formatAuditDate(latestReport.created_at) : 'Never'

  const statCards = [
    { label: 'Total Savings Found', value: totalSavings },
    { label: 'Accounts Connected',  value: accountsConnected },
    { label: 'Reports Generated',   value: reportsGenerated },
    { label: 'Last Scan',           value: lastScan },
  ]

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
    }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>

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
      <main style={{ marginLeft: isMobile ? 0 : '240px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Top bar */}
        <div style={{
          padding: '20px 32px',
          borderBottom: '1px solid #1E1E1C',
          display: 'flex',
          alignItems: runningAudit ? 'flex-start' : 'center',
          justifyContent: 'space-between',
        }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/dashboard/reports"
              style={{
                color: '#888884', fontSize: '14px', fontWeight: 500,
                textDecoration: 'none', padding: '8px 14px',
                border: '1px solid #1E1E1C', borderRadius: '8px',
                transition: 'color 150ms, border-color 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F5F4F0'; e.currentTarget.style.borderColor = '#3B3B38' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#888884'; e.currentTarget.style.borderColor = '#1E1E1C' }}
            >
              View Last Report
            </Link>
            <button
              disabled={runningAudit || awsConnected === false}
              title={awsConnected === false ? 'Connect an AWS account first' : undefined}
              style={{
                backgroundColor: runningAudit ? '#2563EB' : '#3B82F6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: (runningAudit || awsConnected === false) ? 'not-allowed' : 'pointer',
                opacity: runningAudit ? 0.7 : awsConnected === false ? 0.4 : 1,
                transition: 'transform 150ms, box-shadow 150ms',
              }}
              onMouseEnter={e => { if (!runningAudit && awsConnected !== false) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
              onClick={runAudit}
            >
              {runningAudit ? 'Running…' : 'Run Audit'}
            </button>
          </div>
          {runningAudit && (
            <p style={{ color: '#6B7280', fontSize: '13px', margin: '8px 0 0' }}>
              Analyzing your AWS account… {elapsedSeconds}s
            </p>
          )}
          {auditError && !runningAudit && (
            <p style={{ color: '#EF4444', fontSize: '13px', margin: '8px 0 0' }}>
              {auditError}{' '}
              <a href="/dashboard/connect" style={{ color: '#3B82F6' }}>Connect AWS →</a>
            </p>
          )}
        </div>

        {/* AWS connection status bar */}
        <div style={{ padding: '6px 32px', borderBottom: '1px solid #1E1E1C', backgroundColor: '#0D0D0D' }}>
          {awsConnected === true && (
            <p style={{ margin: 0, fontSize: 12, color: '#34D399' }}>✓ AWS account connected</p>
          )}
          {awsConnected === false && (
            <p style={{ margin: 0, fontSize: 12, color: '#666662' }}>
              No AWS account connected —{' '}
              <Link to="/dashboard/connect" style={{ color: '#3B82F6', textDecoration: 'none' }}>Connect AWS →</Link>
            </p>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? '16px' : '32px', flex: 1 }}>

          {/* Welcome banner */}
          {showWelcome && awsConnected === false && reportCount === 0 && (
            <div style={{
              background: '#1a1a18',
              border: '1px solid #2a2a28',
              borderRadius: '8px',
              padding: '24px 28px',
              marginBottom: '24px',
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#3B82F6', textTransform: 'uppercase', margin: '0 0 8px' }}>
                GETTING STARTED
              </p>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', margin: '0 0 20px' }}>
                You're 3 steps away from finding your AWS waste.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                {['1 — Connect AWS', '2 — Run Audit', '3 — View Report'].map((step, i) => (
                  <>
                    <span key={step} style={{ background: '#2a2a28', borderRadius: 20, padding: '6px 14px', fontSize: 13, color: '#9ca3af' }}>
                      {step}
                    </span>
                    {i < 2 && <span key={`arrow-${i}`} style={{ color: '#444', fontSize: 14 }}>→</span>}
                  </>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Link
                  to="/dashboard/connect"
                  style={{
                    backgroundColor: '#3B82F6',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'inline-block',
                  }}
                >
                  Connect your AWS Account →
                </Link>
                <button
                  onClick={dismissWelcome}
                  style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', marginLeft: 16 }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Latest audit summary bar */}
          {latestReport && (
            <div style={{
              display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between',
              flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 0,
              background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8,
              padding: '14px 20px', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, letterSpacing: '0.08em', marginRight: 12 }}>
                  LAST AUDIT
                </span>
                <span style={{ color: '#F5F4F0', fontSize: 14 }}>
                  {formatAuditDate(latestReport.created_at)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#3B82F6', fontWeight: 600, fontSize: 14, marginRight: 20 }}>
                  Found ${(latestReport.total_savings || 0).toLocaleString()} in savings
                </span>
                <Link to="/dashboard/reports" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>
                  View Full Report →
                </Link>
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
            {statCards.map(({ label, value }) => (
              <StatCard key={label} label={label} value={value} />
            ))}
          </div>

          {/* Data-driven content / empty state */}
          {findings.length > 0 ? (
            <>
              {/* Recent findings table */}
              <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, overflow: 'hidden', marginTop: 24 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a28', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F4F0' }}>Recent Findings</span>
                  <Link to="/dashboard/reports" style={{ color: '#3B82F6', fontSize: 13, textDecoration: 'none' }}>View all →</Link>
                </div>
                <table className="findings-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#111110' }}>
                      {['SEVERITY', 'CATEGORY', 'FINDING', 'EST. SAVINGS'].map(col => (
                        <th key={col} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', display: col === 'CATEGORY' && isMobile ? 'none' : undefined }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topFindings.map(finding => (
                      <tr
                        key={finding.id}
                        style={{ borderTop: '1px solid #1e1e1c', cursor: 'pointer', backgroundColor: hoveredRow === finding.id ? '#1e1e1c' : 'transparent' }}
                        onMouseEnter={() => setHoveredRow(finding.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        onClick={() => navigate('/dashboard/reports')}
                      >
                        <td style={{ padding: '14px 20px', fontSize: 14, color: '#F5F4F0', verticalAlign: 'middle' }}>
                          <span style={{
                            ...SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.low,
                            borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                          }}>
                            {finding.severity}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 14, color: '#9ca3af', verticalAlign: 'middle', display: isMobile ? 'none' : 'table-cell' }}>
                          {finding.category}
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 14, color: '#F5F4F0', verticalAlign: 'middle', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {finding.title}
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 14, verticalAlign: 'middle' }}>
                          {finding.estimatedMonthlySavings > 0
                            ? <span style={{ color: '#3B82F6', fontWeight: 600 }}>${finding.estimatedMonthlySavings.toLocaleString()}/mo</span>
                            : <span style={{ color: '#6b7280' }}>—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Savings by category */}
              {sortedCategories.length > 0 && (
                <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: '20px', marginTop: 16 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#F5F4F0', marginBottom: 20, margin: '0 0 20px' }}>
                    Savings by Category
                  </p>
                  {sortedCategories.map(([category, total]) => (
                    <div key={category} style={{ display: 'flex', alignItems: 'center', marginBottom: 14, gap: 12 }}>
                      <span style={{ width: 110, fontSize: 13, color: '#9ca3af' }}>{category}</span>
                      <div style={{ flex: 1, background: '#2a2a28', borderRadius: 4, height: 6 }}>
                        <div style={{ width: (total / maxSavings * 100) + '%', background: '#3B82F6', borderRadius: 4, height: 6 }} />
                      </div>
                      <span style={{ width: 80, textAlign: 'right', fontSize: 13, color: '#3B82F6', fontWeight: 600 }}>
                        ${total.toLocaleString()}/mo
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : latestReport ? (
            /* Audit ran but no findings */
            <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: 32, textAlign: 'center', marginTop: 24 }}>
              <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>No waste found in your last audit.</p>
              <p style={{ color: '#444', fontSize: 13, marginTop: 8, margin: '8px 0 0' }}>Your AWS account looks clean. We'll re-scan automatically every 30 days.</p>
            </div>
          ) : (
            /* No audit yet — original empty state */
            <div style={{
              backgroundColor: '#0D0D0D',
              border: '1px solid #1E1E1C',
              borderRadius: '12px',
              padding: '64px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                backgroundColor: '#111110',
                border: '1px solid #1E1E1C',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px',
              }}>
                <CloudIcon />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#F5F4F0', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                No AWS accounts connected yet
              </h2>
              <p style={{ color: '#666662', fontSize: '14px', lineHeight: 1.7, maxWidth: '380px', margin: '0 0 28px' }}>
                Connect your first AWS account to run your first audit and start finding savings.
              </p>
              <Link
                to="/dashboard/connect"
                style={{
                  backgroundColor: '#3B82F6',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  padding: '10px 22px',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'transform 150ms, box-shadow 150ms',
                  display: 'inline-block',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                Connect AWS Account →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function NavItem({ label, icon, path, active }) {
  return (
    <Link
      to={path}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 20px',
        fontSize: '14px',
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
      <span style={{ fontSize: '16px', lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      {label}
    </Link>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={{
      backgroundColor: '#0D0D0D',
      border: '1px solid #1E1E1C',
      borderRadius: '10px',
      padding: '20px 24px',
    }}>
      <div style={{ fontSize: '12px', color: '#666662', fontWeight: 500, marginBottom: '10px', letterSpacing: '0.02em' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#F5F4F0', letterSpacing: '-0.03em' }}>
        {value}
      </div>
    </div>
  )
}

function CloudIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
    </svg>
  )
}
