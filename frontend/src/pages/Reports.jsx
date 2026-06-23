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
  { label: 'Dashboard',   icon: '⊡', path: '/dashboard' },
  { label: 'Reports',     icon: '≡', path: '/dashboard/reports' },
  { label: 'Connect AWS', icon: '⊕', path: '/dashboard/connect' },
  { label: 'Settings',    icon: '⊙', path: '/dashboard/settings' },
]

const SEV_COLOR  = { high: '#EF4444', medium: '#F59E0B', low: '#6B7280' }
const SEV_BG     = { high: 'rgba(239,68,68,0.1)', medium: 'rgba(245,158,11,0.1)', low: 'rgba(107,114,128,0.1)' }
const SEV_ORDER  = { high: 0, medium: 1, low: 2 }

export default function Reports() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [runningAudit, setRunningAudit] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [report, setReport] = useState(null)
  const [accountName, setAccountName] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }

      setUserEmail(session.user.email)

      // Fetch most recent report and account in parallel
      const [{ data: reports }, { data: accounts }] = await Promise.all([
        supabase
          .from('audit_reports')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('aws_accounts')
          .select('account_name')
          .eq('user_id', session.user.id)
          .limit(1),
      ])

      if (reports?.length) setReport(reports[0])
      if (accounts?.length) setAccountName(accounts[0].account_name || 'My AWS Account')
      setLoading(false)
    }
    init()
  }, [navigate])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function runNewAudit() {
    setRunningAudit(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/audit/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })
      const data = await res.json()
      if (res.ok && data.reportId) {
        // Reload the new report from Supabase
        const { data: reports } = await supabase
          .from('audit_reports')
          .select('*')
          .eq('id', data.reportId)
          .single()
        if (reports) setReport(reports)
      }
    } catch (err) {
      console.error('Audit failed:', err)
    }
    setRunningAudit(false)
  }

  const sortedFindings = report?.findings
    ? [...report.findings].sort((a, b) => (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3))
    : []

  const totalSavings = report?.total_savings ?? 0

  const auditDate = report?.created_at
    ? new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

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
          {NAV_ITEMS.map(({ label, icon, path }) => (
            <SidebarLink key={path} label={label} icon={icon} path={path} active={location.pathname === path} />
          ))}
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
              padding: '7px 0', cursor: signingOut ? 'not-allowed' : 'pointer', transition: 'border-color 150ms, color 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B3B38'; e.currentTarget.style.color = '#F5F4F0' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1C'; e.currentTarget.style.color = '#666662' }}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Top bar */}
        <div style={{
          padding: '20px 32px', borderBottom: '1px solid #1E1E1C',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em' }}>
            Reports
          </h1>
          <button
            onClick={runNewAudit}
            disabled={runningAudit}
            style={{
              backgroundColor: runningAudit ? '#2563EB' : '#3B82F6', color: '#fff',
              border: 'none', borderRadius: 8, padding: '8px 18px',
              fontSize: 14, fontWeight: 600,
              cursor: runningAudit ? 'not-allowed' : 'pointer',
              opacity: runningAudit ? 0.7 : 1,
              transition: 'transform 150ms, box-shadow 150ms',
            }}
            onMouseEnter={e => { if (!runningAudit) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            {runningAudit ? 'Running Audit…' : 'Run New Audit'}
          </button>
        </div>

        <div style={{ padding: 32, flex: 1 }}>

          {/* ── NO REPORTS ── */}
          {!report ? (
            <div style={{
              backgroundColor: '#0D0D0D', border: '1px solid #1E1E1C',
              borderRadius: 12, padding: '64px 32px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, backgroundColor: '#111110',
                border: '1px solid #1E1E1C', display: 'flex', alignItems: 'center',
                justifyContent: 'center', marginBottom: 20,
              }}>
                <ReportIcon />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                No audits run yet
              </h2>
              <p style={{ color: '#666662', fontSize: 14, lineHeight: 1.7, maxWidth: 380, margin: '0 0 28px' }}>
                Go to your dashboard and click Run Audit to scan your AWS account for cost optimization opportunities.
              </p>
              <Link
                to="/dashboard"
                style={{
                  backgroundColor: '#3B82F6', color: '#fff', textDecoration: 'none',
                  borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 600,
                  display: 'inline-block', transition: 'transform 150ms, box-shadow 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                Go to Dashboard →
              </Link>
            </div>
          ) : (
            <>
              {/* ── REPORT HEADER ── */}
              <div style={{
                backgroundColor: '#0D0D0D', border: '1px solid #1E1E1C',
                borderRadius: 12, padding: '28px 32px', marginBottom: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#F5F4F0', margin: '0 0 6px' }}>
                      AWS Cost Audit Report
                    </h2>
                    <p style={{ fontSize: 13, color: '#666662', margin: 0 }}>
                      {accountName}{accountName && auditDate ? ' · ' : ''}{auditDate}
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
                    borderRadius: 100, padding: '6px 16px',
                    fontSize: 13, fontWeight: 600, color: '#93C5FD', whiteSpace: 'nowrap',
                  }}>
                    Potential savings: ${totalSavings.toLocaleString()}/mo
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 20, borderTop: '1px solid #1E1E1C' }}>
                  <Stat label="Findings" value={sortedFindings.length} />
                  <Stat label="High severity" value={sortedFindings.filter(f => f.severity === 'high').length} valueColor="#EF4444" />
                  <Stat label="Medium severity" value={sortedFindings.filter(f => f.severity === 'medium').length} valueColor="#F59E0B" />
                  <Stat label="Low severity" value={sortedFindings.filter(f => f.severity === 'low').length} valueColor="#6B7280" />
                </div>
              </div>

              {/* ── FINDINGS ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sortedFindings.map((finding) => (
                  <FindingCard key={finding.id} finding={finding} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function FindingCard({ finding }) {
  const sev = finding.severity || 'low'
  const color = SEV_COLOR[sev] || '#6B7280'
  const bg = SEV_BG[sev] || 'rgba(107,114,128,0.1)'

  return (
    <div style={{
      backgroundColor: '#0D0D0D',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: '20px 24px',
      transition: 'border-color 200ms',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      {/* Top row: badges + savings */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            backgroundColor: bg, color, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '3px 9px', borderRadius: 4,
          }}>
            {sev}
          </span>
          {finding.category && (
            <span style={{
              backgroundColor: 'rgba(255,255,255,0.05)', color: '#888884',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', padding: '3px 9px', borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {finding.category}
            </span>
          )}
        </div>
        {finding.estimatedMonthlySavings > 0 && (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#34D399' }}>
            ${finding.estimatedMonthlySavings.toLocaleString()}/mo
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#F5F4F0', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
        {finding.title}
      </h3>

      {/* Description */}
      {finding.description && (
        <p style={{ fontSize: 13, color: '#888884', lineHeight: 1.65, margin: '0 0 10px' }}>
          {finding.description}
        </p>
      )}

      {/* Recommendation */}
      {finding.recommendation && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ color: '#3B82F6', fontSize: 13, flexShrink: 0, marginTop: 1 }}>→</span>
          <p style={{ fontSize: 13, color: '#6B8CBF', lineHeight: 1.65, margin: 0 }}>
            {finding.recommendation}
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, valueColor }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#666662', fontWeight: 500, marginBottom: 4, letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: valueColor || '#F5F4F0', letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  )
}

function SidebarLink({ label, icon, path, active }) {
  return (
    <Link
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
}

function ReportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
