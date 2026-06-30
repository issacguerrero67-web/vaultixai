import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AccountSwitcher from '../components/AccountSwitcher'
import FeatureGate from '../components/FeatureGate'
import { useUserPlan } from '../hooks/useUserPlan'

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

const CATEGORY_ICONS = {
  'EC2': '🖥',
  'RDS': '🗄',
  'S3': '🪣',
  'EBS': '💾',
  'Network': '🌐',
  'SavingsPlans': '💰',
  'General': '⚙️',
}

const SEV_COLOR  = { high: '#EF4444', medium: '#F59E0B', low: '#6B7280' }
const SEV_BG     = { high: 'rgba(239,68,68,0.1)', medium: 'rgba(245,158,11,0.1)', low: 'rgba(107,114,128,0.1)' }
const SEV_ORDER  = { high: 0, medium: 1, low: 2 }

function formatRecommendation(text) {
  const steps = text.split(/(?=\d+\.\s)/).filter(s => s.trim())
  if (steps.length <= 1) {
    return <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{text}</p>
  }
  return (
    <ol style={{ margin: 0, paddingLeft: 20, color: '#9ca3af', fontSize: 14, lineHeight: 1.8 }}>
      {steps.map((step, i) => (
        <li key={i} style={{ marginBottom: 6 }}>{step.replace(/^\d+\.\s/, '')}</li>
      ))}
    </ol>
  )
}

export default function Reports() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [runningAudit, setRunningAudit] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [report, setReport] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [activeAccountId, setActiveAccountId] = useState(() => localStorage.getItem('vaultix_active_account') || null)
  const [accountName, setAccountName] = useState('')
  const [searchParams] = useSearchParams()
  const paymentSuccess = searchParams.get('payment') === 'success'
  const [expandedFindings, setExpandedFindings] = useState({})
  const [allExpanded, setAllExpanded] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactSent, setContactSent] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [pastReports, setPastReports] = useState([])
  const [selectedReportId, setSelectedReportId] = useState(null)
  const { isPaid } = useUserPlan()
  const [auditUnlocked, setAuditUnlocked] = useState(false)
  const [savingsFoundAmt, setSavingsFoundAmt] = useState(0)

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

      const [{ data: allAccounts }, { data: profile }] = await Promise.all([
        supabase.from('aws_accounts').select('id, account_name').eq('user_id', session.user.id),
        supabase.from('profiles').select('full_name, audit_unlocked, savings_found').eq('id', session.user.id).single(),
      ])

      setAccounts(allAccounts ?? [])

      const storedId = localStorage.getItem('vaultix_active_account')
      const activeId = storedId && (allAccounts ?? []).find(a => a.id === storedId)
        ? storedId
        : allAccounts?.[0]?.id ?? null
      setActiveAccountId(activeId)

      if (activeId) {
        const activeAcc = (allAccounts ?? []).find(a => a.id === activeId)
        setAccountName(activeAcc?.account_name || 'My Cloud Account')

        const { data: reports } = await supabase
          .from('audit_reports')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('aws_account_id', activeId)
          .order('created_at', { ascending: false })
          .limit(10)
        if (reports?.length) {
          setReport(reports[0])
          setPastReports(reports)
          setSelectedReportId(reports[0]?.id ?? null)
        }
      }

      if (profile?.full_name) setDisplayName(profile.full_name)
      setAuditUnlocked(profile?.audit_unlocked ?? false)
      setSavingsFoundAmt(profile?.savings_found ?? 0)
      setLoading(false)
    }
    init()
  }, [navigate])

  async function handleAccountSwitch(accountId) {
    setActiveAccountId(accountId)
    localStorage.setItem('vaultix_active_account', accountId)
    setReport(null)
    setPastReports([])
    setSelectedReportId(null)
    const activeAcc = accounts.find(a => a.id === accountId)
    setAccountName(activeAcc?.account_name || 'My AWS Account')
    const { data: reports } = await supabase
      .from('audit_reports')
      .select('*')
      .eq('user_id', (await supabase.auth.getSession()).data.session?.user.id)
      .eq('aws_account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(10)
    if (reports?.length) {
      setReport(reports[0])
      setPastReports(reports)
      setSelectedReportId(reports[0]?.id ?? null)
    }
  }

  async function handleContactSubmit() {
    if (!contactForm.name || !contactForm.email) return
    try {
      await fetch('https://formspree.io/f/xwvdvzbp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: contactForm.name, email: contactForm.email, message: contactForm.message }),
      })
      setContactSent(true)
    } catch (err) {
      console.error(err)
    }
  }

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
      overflowX: 'hidden', width: '100%', maxWidth: '100vw',
    }}>

      {/* ── CONTACT MODAL ── */}
      {showContact && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowContact(false) }}>
          <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 12, padding: 32, width: '100%', maxWidth: 480, position: 'relative', margin: '0 16px' }}>
            <button onClick={() => setShowContact(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#6b7280', fontSize: 20, cursor: 'pointer' }}>×</button>
            {contactSent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <span style={{ fontSize: 32, color: '#22c55e', marginBottom: 12, display: 'block' }}>✓</span>
                <p style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', marginBottom: 8 }}>Message sent!</p>
                <p style={{ fontSize: 14, color: '#6b7280' }}>We'll be in touch within 24 hours.</p>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F4F0', marginBottom: 8 }}>Talk to an Expert</h2>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>We'll review your findings and help implement the fixes. You only pay a percentage of what we actually save you.</p>
                <input type="text" placeholder="Your name" value={contactForm.name}
                  onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '10px 14px', color: '#F5F4F0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />
                <input type="email" placeholder="Work email" value={contactForm.email}
                  onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                  style={{ width: '100%', background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '10px 14px', color: '#F5F4F0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />
                <textarea rows={4} value={contactForm.message}
                  onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                  style={{ width: '100%', background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '10px 14px', color: '#F5F4F0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
                <button onClick={handleContactSubmit}
                  style={{ width: '100%', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 6, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
                  Send Message →
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
          {NAV_ITEMS.map(({ label, icon, path }) => (
            <SidebarLink key={path} label={label} icon={icon} path={path} active={location.pathname === path} />
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
      <main style={{ marginLeft: isMobile ? 0 : 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0, overflowX: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          padding: '20px 32px', borderBottom: '1px solid #1E1E1C',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flexShrink: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em', flexShrink: 0 }}>
              Reports
            </h1>
            <AccountSwitcher
              activeAccountId={activeAccountId}
              onAccountChange={handleAccountSwitch}
            />
          </div>
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
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
            onMouseEnter={e => { if (!runningAudit) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            {runningAudit ? 'Running Audit…' : 'Run New Audit'}
          </button>
        </div>

        <div style={{ padding: isMobile ? '16px 16px 70px' : 32, flex: 1 }}>

          {paymentSuccess && auditUnlocked && (
            <div style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 8, padding: '16px 20px', marginBottom: 24,
              color: '#22C55E', fontSize: 14, fontWeight: 500,
            }}>
              🎉 Full audit unlocked! Your findings are now fully visible.
            </div>
          )}

          {/* Unlock banner for free users with findings */}
          {!auditUnlocked && report && (report.total_savings || 0) > 0 && (
            <div style={{
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 8, padding: '16px 20px', marginBottom: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F4F0', marginBottom: 4 }}>
                  🔒 Dollar amounts and resource IDs are hidden
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>
                  Unlock your full audit to see exact savings, ARNs, and fix instructions.
                </div>
              </div>
              <Link
                to="/dashboard/billing"
                style={{ background: '#3B82F6', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Unlock Full Audit →
              </Link>
            </div>
          )}

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
                Go to your dashboard and click Run Audit to scan your cloud account for cost optimization opportunities.
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
                borderRadius: 12, padding: isMobile ? '16px' : '28px 32px', marginBottom: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#F5F4F0', margin: '0 0 6px' }}>
                      Cloud Cost Audit Report
                    </h2>
                    <p style={{ fontSize: 13, color: '#666662', margin: 0 }}>
                      {accountName}{accountName && auditDate ? ' · ' : ''}{auditDate}
                    </p>
                    {displayName && (
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                        Prepared for <span style={{ color: '#F5F4F0', fontWeight: 500 }}>{displayName}</span>
                      </div>
                    )}
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
                    borderRadius: 100, padding: '6px 16px',
                    fontSize: 13, fontWeight: 600, color: '#93C5FD', whiteSpace: 'nowrap',
                  }}>
                    Potential savings: ${totalSavings.toLocaleString()}/mo
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20, paddingTop: 20, borderTop: '1px solid #1E1E1C', alignItems: 'end' }}>
                  <Stat label="Total" value={sortedFindings.length} isMobile={isMobile} />
                  <Stat label="High" value={sortedFindings.filter(f => f.severity === 'high').length} valueColor="#EF4444" isMobile={isMobile} />
                  <Stat label="Medium" value={sortedFindings.filter(f => f.severity === 'medium').length} valueColor="#F59E0B" isMobile={isMobile} />
                  <Stat label="Low" value={sortedFindings.filter(f => f.severity === 'low').length} valueColor="#6B7280" isMobile={isMobile} />
                </div>
              </div>

              {/* ── FINDINGS ── */}
              <div style={{
                position: 'sticky', top: 0,
                background: '#111110', borderBottom: '1px solid #2a2a28',
                padding: '12px 0', marginBottom: 16,
                display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 20, alignItems: isMobile ? 'flex-start' : 'center', zIndex: 10,
              }}>
                <span style={{ fontSize: 13, color: '#F5F4F0', fontWeight: 600 }}>
                  {sortedFindings.length} finding{sortedFindings.length !== 1 ? 's' : ''}
                </span>
                <span style={{ color: '#444' }}>·</span>
                <button
                  onClick={() => {
                    const next = !allExpanded
                    setAllExpanded(next)
                    const map = {}
                    sortedFindings.forEach(f => { map[f.id] = next })
                    setExpandedFindings(map)
                  }}
                  style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: 13, cursor: 'pointer', padding: 0 }}
                >
                  {allExpanded ? 'Collapse all' : 'Expand all'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sortedFindings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    expanded={!!expandedFindings[finding.id]}
                    onToggle={() => setExpandedFindings(prev => ({ ...prev, [finding.id]: !prev[finding.id] }))}
                    isMobile={isMobile}
                    gated={!auditUnlocked}
                  />
                ))}
              </div>

              {/* ── REPORT HISTORY ── */}
              <FeatureGate
                isPaid={auditUnlocked}
                savingsFound={savingsFoundAmt}
                message="Unlock your audit to view report history"
                style={{ marginTop: 32, borderRadius: 8 }}
              >
                <div style={{ marginTop: 32, background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a2a28' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#F5F4F0' }}>Report History</span>
                  </div>
                  {pastReports.length <= 1 ? (
                    <div style={{ padding: '20px', color: '#6b7280', fontSize: 13 }}>No previous reports yet. Run more audits to build history.</div>
                  ) : (
                    pastReports.map((r, i) => (
                      <div
                        key={r.id}
                        onClick={() => { setSelectedReportId(r.id); setReport(r) }}
                        style={{
                          padding: '12px 20px',
                          borderTop: i === 0 ? 'none' : '1px solid #1e1e1c',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: selectedReportId === r.id ? '#222220' : 'transparent',
                          transition: 'background 150ms',
                        }}
                        onMouseEnter={e => { if (selectedReportId !== r.id) e.currentTarget.style.background = '#1e1e1c' }}
                        onMouseLeave={e => { if (selectedReportId !== r.id) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: 13, color: '#F5F4F0' }}>
                          {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span style={{ fontSize: 13, color: '#3B82F6', fontWeight: 600 }}>
                          ${(r.total_savings || 0).toLocaleString()}/mo
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </FeatureGate>

              {/* ── CONTACT CTA ── */}
              <div style={{
                marginTop: 48,
                padding: 32,
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
              }}>
                <div>
                  <h3 style={{ color: '#F5F4F0', fontSize: 18, fontWeight: 600, margin: '0 0 8px 0' }}>
                    Want us to implement these fixes for you?
                  </h3>
                  <p style={{ color: '#9CA3AF', fontSize: 14, margin: 0 }}>
                    Our team can handle the remediation — you only pay a percentage of what we save you.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setContactSent(false)
                    setContactForm({
                      name: displayName || '',
                      email: userEmail || '',
                      message: `I have ${sortedFindings.length} findings in my Cloud Cost Audit Report with potential savings of $${totalSavings.toLocaleString()}/mo. I'd like help implementing the fixes.`,
                    })
                    setShowContact(true)
                  }}
                  style={{
                    background: '#3B82F6', color: '#fff', border: 'none',
                    padding: '12px 24px', borderRadius: 8,
                    fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', cursor: 'pointer',
                  }}
                >
                  Talk to an Expert →
                </button>
              </div>
            </>
          )}
        </div>
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

function FindingCard({ finding, expanded, onToggle, isMobile, gated = false }) {
  const sev = finding.severity || 'low'
  const color = SEV_COLOR[sev] || '#6B7280'
  const bg = SEV_BG[sev] || 'rgba(107,114,128,0.1)'
  const descPreview = finding.description
    ? finding.description.length > 120
      ? finding.description.slice(0, 120) + '…'
      : finding.description
    : ''

  return (
    <div
      onClick={onToggle}
      style={{
        background: '#1a1a18',
        border: '1px solid #2a2a28',
        borderRadius: 8, padding: '18px 20px', marginBottom: 12, cursor: 'pointer',
        transition: 'border-color 150ms',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a38'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a28'}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
          <span style={{
            backgroundColor: bg, color, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '3px 9px', borderRadius: 4, flexShrink: 0,
          }}>
            {sev}
          </span>
          {finding.category && (
            <span style={{
              backgroundColor: 'rgba(255,255,255,0.05)', color: '#888884',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', padding: '3px 9px', borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
            }}>
              {CATEGORY_ICONS[finding.category] || '⚙️'} {finding.category}
            </span>
          )}
          <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F4F0', marginLeft: 8, letterSpacing: '-0.01em', minWidth: 0, whiteSpace: isMobile ? 'normal' : undefined }}>
            {finding.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {gated ? (
            <span
              title="Unlock full audit to see exact savings"
              style={{ fontSize: 13, fontWeight: 600, color: '#34D399', filter: 'blur(5px)', userSelect: 'none', cursor: 'help' }}
            >
              $999/mo
            </span>
          ) : finding.estimatedMonthlySavings > 0 ? (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#34D399' }}>
              ${finding.estimatedMonthlySavings.toLocaleString()}/mo
            </span>
          ) : null}
          <span style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {expanded ? 'Close ↑' : 'Details ↓'}
          </span>
        </div>
      </div>

      {/* Collapsed preview */}
      {!expanded && descPreview && !gated && (
        <p style={{ fontSize: 13, color: '#666662', lineHeight: 1.5, margin: '10px 0 0' }}>
          {descPreview}
        </p>
      )}
      {!expanded && gated && (
        <p style={{ fontSize: 13, color: '#444', lineHeight: 1.5, margin: '10px 0 0', fontStyle: 'italic' }}>
          🔒 Unlock full audit to see description, fix steps, and resource IDs
        </p>
      )}

      {/* Expanded content */}
      {expanded && !gated && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #2a2a28' }} onClick={e => e.stopPropagation()}>
          {finding.description && (
            <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, marginBottom: 16, margin: '0 0 16px' }}>
              {finding.description}
            </p>
          )}
          {finding.recommendation && (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', letterSpacing: '0.08em', marginBottom: 8, margin: '0 0 8px' }}>
                RECOMMENDATION
              </p>
              {formatRecommendation(finding.recommendation)}
            </>
          )}
        </div>
      )}
      {expanded && gated && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #2a2a28', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 12px' }}>
            Full details are locked. Unlock your audit to see exact amounts, resource IDs, and step-by-step fix instructions.
          </p>
          <a
            href="/dashboard/billing"
            style={{ color: '#3B82F6', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            Unlock Full Audit →
          </a>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, valueColor, isMobile }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: isMobile ? 10 : 12, color: '#6b7280', fontWeight: 600, lineHeight: 1.2 }}>
        {label}
      </div>
      <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: valueColor || '#F5F4F0', letterSpacing: '-0.02em' }}>
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
