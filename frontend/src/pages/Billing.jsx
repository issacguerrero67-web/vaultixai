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

export default function Billing() {
  const navigate = useNavigate()
  const location = useLocation()

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [signingOut, setSigningOut] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')

  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [savingsSummary, setSavingsSummary] = useState(null)
  const [profile, setProfile] = useState(null)
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data: { session } } = await supabase.auth.getSession()
      const token = session.access_token

      setUserEmail(user.email)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)
      if (prof?.full_name) setDisplayName(prof.full_name)

      try {
        const invoicesRes = await fetch(`${BACKEND_URL}/api/stripe/invoices`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const invoicesData = await invoicesRes.json()
        setInvoices(invoicesData.invoices || [])
        setSubscription(invoicesData.subscription)
        setHasSubscription(invoicesData.hasSubscription)
      } catch (err) {
        console.error('Failed to fetch invoices:', err)
      }

      try {
        const summaryRes = await fetch(`${BACKEND_URL}/api/stripe/savings-summary`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const summaryData = await summaryRes.json()
        setSavingsSummary(summaryData)
      } catch (err) {
        console.error('Failed to fetch savings summary:', err)
      }

      setLoading(false)
    }
    init()
  }, [navigate])

  async function startCheckout(tier) {
    try {
      setCheckoutLoading(tier)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session.access_token
      const res = await fetch(`${BACKEND_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Error: ' + (data.error || 'Unknown error'))
    } catch (err) {
      alert('Something went wrong. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
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
      <main style={{ marginLeft: isMobile ? 0 : 240, flex: 1, padding: isMobile ? '16px 16px 80px' : '28px 32px', minWidth: 0, overflowX: 'hidden' }}>
        <div style={{ maxWidth: 760 }}>

          {/* Page header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em' }}>Plans & Billing</h1>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
                Success-based pricing — we only charge when we save you money.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, height: 80 }} />
              ))}
            </div>
          ) : (
            <>
              {/* ── SECTION 1: CURRENT PLAN ── */}
              {hasSubscription && profile?.plan && (
                <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: 24, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Current Plan</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#F5F4F0' }}>
                        {profile.plan === 'team' ? 'Team Plan' : 'Standard Plan'}
                      </div>
                      <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                        {profile.plan === 'team' ? '15%' : '20%'} of verified monthly savings
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600 }}>
                        Active
                      </span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>✦ Autopilot included</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 16, paddingTop: 20, borderTop: '1px solid #2a2a28' }}>
                    {[
                      { label: 'BILLING CYCLE', value: 'Monthly' },
                      { label: 'NEXT BILLING', value: subscription?.current_period_end
                        ? new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'On savings verified' },
                      { label: 'STATUS', value: subscription?.status === 'active' ? 'Active' : subscription?.status || 'Active' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, letterSpacing: '0.08em' }}>{label}</span>
                        <span style={{ fontSize: 14, color: '#F5F4F0', fontWeight: 500 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SECTION 2: SAVINGS ROI SUMMARY ── */}
              {savingsSummary && savingsSummary.latestSavings > 0 && (
                <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: 24, marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#3B82F6', marginBottom: 16, textTransform: 'uppercase' }}>
                    Your Savings Summary
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16 }}>
                    {[
                      { label: 'AWS Waste Found', value: `$${savingsSummary.latestSavings.toLocaleString()}/mo`, color: '#F5F4F0' },
                      { label: 'Vaultix Fee', value: `$${savingsSummary.latestFee.toLocaleString()}/mo`, color: '#6b7280' },
                      { label: 'Your Net Savings', value: `$${savingsSummary.netSavings.toLocaleString()}/mo`, color: '#22c55e' },
                      { label: 'ROI', value: savingsSummary.roi ? `${savingsSummary.roi}x return` : 'Pending', color: '#3B82F6' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                        <span style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {savingsSummary.totalPaid > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(59,130,246,0.15)', fontSize: 13, color: '#6b7280' }}>
                      Total paid to Vaultix: <span style={{ color: '#F5F4F0', fontWeight: 500 }}>${savingsSummary.totalPaid.toFixed(2)}</span>
                      {' · '}
                      Total savings identified: <span style={{ color: '#22c55e', fontWeight: 500 }}>${savingsSummary.totalSavingsFound.toLocaleString()}</span>
                      {' · '}
                      Audits run: <span style={{ color: '#F5F4F0', fontWeight: 500 }}>{savingsSummary.reportCount}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── SECTION 3: PAYMENT HISTORY ── */}
              <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a28', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#F5F4F0' }}>Payment History</span>
                  {invoices.length > 0 && (
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                {invoices.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>No payment history yet.</div>
                    <div style={{ fontSize: 12, color: '#444' }}>
                      {hasSubscription
                        ? 'Charges appear after we verify your savings.'
                        : 'Subscribe to a plan to get started.'}
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 500 : undefined }}>
                      <thead>
                        <tr style={{ background: '#111110' }}>
                          {['DATE', 'DESCRIPTION', 'AMOUNT', 'STATUS', 'RECEIPT'].map(col => (
                            <th key={col} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map(invoice => (
                          <tr key={invoice.id} style={{ borderTop: '1px solid #1e1e1c' }}>
                            <td style={{ padding: '14px 20px', fontSize: 13, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                              {new Date(invoice.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: 13, color: '#F5F4F0', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {invoice.description || 'Vaultix AI — AWS Cost Optimization'}
                            </td>
                            <td style={{ padding: '14px 20px', fontSize: 13, color: '#F5F4F0', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              ${((invoice.amount_paid || invoice.amount_due || 0) / 100).toFixed(2)}
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{
                                background: invoice.status === 'paid' ? 'rgba(34,197,94,0.1)' : invoice.status === 'open' ? 'rgba(251,191,36,0.1)' : 'rgba(107,114,128,0.1)',
                                border: `1px solid ${invoice.status === 'paid' ? 'rgba(34,197,94,0.2)' : invoice.status === 'open' ? 'rgba(251,191,36,0.2)' : 'rgba(107,114,128,0.2)'}`,
                                color: invoice.status === 'paid' ? '#22c55e' : invoice.status === 'open' ? '#f59e0b' : '#6b7280',
                                borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                              }}>
                                {invoice.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              {invoice.invoice_pdf ? (
                                <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer"
                                  style={{ color: '#3B82F6', fontSize: 13, textDecoration: 'none' }}>
                                  PDF ↗
                                </a>
                              ) : invoice.hosted_invoice_url ? (
                                <a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                                  style={{ color: '#3B82F6', fontSize: 13, textDecoration: 'none' }}>
                                  View ↗
                                </a>
                              ) : (
                                <span style={{ color: '#444', fontSize: 13 }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── SECTION 4: PLAN SELECTION ── */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#F5F4F0', marginBottom: 4 }}>
                  {hasSubscription ? 'Change Plan' : 'Choose a Plan'}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                  {hasSubscription
                    ? 'Upgrade or switch your plan at any time.'
                    : 'You only pay when we find real savings. Your plan activates after your first audit.'}
                </div>
              </div>

              {!hasSubscription && (
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ color: '#3B82F6', fontSize: 16 }}>ℹ</span>
                  <span style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.5 }}>
                    You only pay when we find real savings. Your plan activates automatically after your first audit identifies waste in your AWS account.
                  </span>
                </div>
              )}

              {/* Standard plan card */}
              <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#F5F4F0' }}>Standard</span>
                    <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 10 }}>— For startups and small teams</span>
                  </div>
                  {profile?.plan === 'standard' && hasSubscription && (
                    <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3B82F6', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                      Current
                    </span>
                  )}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#F5F4F0' }}>20%</span>
                  <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 6 }}>of verified savings</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: 20 }}>
                  {['Up to 3 AWS accounts', 'Full AI cost audit', 'Monthly re-scans', 'Email findings report', 'Autopilot — automated fix execution', 'Pre-deletion snapshots & rollback'].map(f => (
                    <span key={f} style={{ fontSize: 13, color: '#9ca3af' }}>✓ {f}</span>
                  ))}
                </div>
                <button
                  onClick={() => !(profile?.plan === 'standard' && hasSubscription) && startCheckout('standard')}
                  disabled={(profile?.plan === 'standard' && hasSubscription) || checkoutLoading === 'standard'}
                  style={{
                    background: (profile?.plan === 'standard' && hasSubscription) ? '#2a2a28' : '#3B82F6',
                    color: (profile?.plan === 'standard' && hasSubscription) ? '#6b7280' : 'white',
                    border: 'none', borderRadius: 6, padding: '12px 20px', fontSize: 14,
                    fontWeight: 600,
                    cursor: (profile?.plan === 'standard' && hasSubscription) ? 'not-allowed' : checkoutLoading === 'standard' ? 'not-allowed' : 'pointer',
                    width: '100%', transition: 'background 150ms',
                  }}
                >
                  {(profile?.plan === 'standard' && hasSubscription) ? 'Current Plan' : checkoutLoading === 'standard' ? 'Loading...' : 'Start Standard Plan (20% of savings)'}
                </button>
              </div>

              {/* Team plan card */}
              <div style={{ background: '#1a1a18', border: '1px solid #3B82F6', borderRadius: 8, padding: 24, marginBottom: 16, position: 'relative' }}>
                <span style={{ position: 'absolute', top: -10, left: 20, background: '#3B82F6', color: 'white', borderRadius: 4, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  MOST POPULAR
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#F5F4F0' }}>Team</span>
                    <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 10 }}>— For growing engineering teams</span>
                  </div>
                  {profile?.plan === 'team' && hasSubscription && (
                    <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3B82F6', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                      Current
                    </span>
                  )}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#F5F4F0' }}>15%</span>
                  <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 6 }}>of verified savings</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: 20 }}>
                  {['Unlimited AWS accounts', 'Everything in Standard', 'Autopilot included', 'Slack alerts', 'Priority support', 'Quarterly business review'].map(f => (
                    <span key={f} style={{ fontSize: 13, color: '#9ca3af' }}>✓ {f}</span>
                  ))}
                </div>
                <button
                  onClick={() => !(profile?.plan === 'team' && hasSubscription) && startCheckout('team')}
                  disabled={(profile?.plan === 'team' && hasSubscription) || checkoutLoading === 'team'}
                  style={{
                    background: (profile?.plan === 'team' && hasSubscription) ? '#2a2a28' : '#3B82F6',
                    color: (profile?.plan === 'team' && hasSubscription) ? '#6b7280' : 'white',
                    border: 'none', borderRadius: 6, padding: '12px 20px', fontSize: 14,
                    fontWeight: 600,
                    cursor: (profile?.plan === 'team' && hasSubscription) ? 'not-allowed' : checkoutLoading === 'team' ? 'not-allowed' : 'pointer',
                    width: '100%', transition: 'background 150ms',
                  }}
                >
                  {(profile?.plan === 'team' && hasSubscription) ? 'Current Plan' : checkoutLoading === 'team' ? 'Loading...' : 'Start Team Plan (15% of savings)'}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: 24, color: '#6b7280', fontSize: 13 }}>
                Payments processed securely by Stripe.{' · '}
                <a href="mailto:issac@vaultixai.app" style={{ color: '#3B82F6', textDecoration: 'none' }}>Need help? Contact us</a>
              </div>
            </>
          )}

        </div>
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
