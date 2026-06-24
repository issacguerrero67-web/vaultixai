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
  { label: 'Autopilot',    icon: '⚡', path: '/dashboard/autopilot' },
  { label: 'Settings',     icon: '⊙', path: '/dashboard/settings' },
]

export default function Billing() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [status, setStatus] = useState(null) // { tier, subscriptionStatus, stripeCustomerId }
  const [checkoutLoading, setCheckoutLoading] = useState(null) // 'standard' | 'team' | null
  const [savingsAmount, setSavingsAmount] = useState(0)
  const [reportDate, setReportDate] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [showContact, setShowContact] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactSent, setContactSent] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.email) return
    try {
      await fetch('https://formspree.io/f/xwvdvzbp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: contactForm.name, email: contactForm.email, message: contactForm.message })
      })
      setContactSent(true)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }
      setUserEmail(session.user.email)

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stripe/status`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
        if (res.ok) setStatus(await res.json())
      } catch (err) {
        console.error('Failed to fetch billing status:', err)
      }

      const { data: latestReport } = await supabase
        .from('audit_reports')
        .select('total_savings, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestReport) {
        setSavingsAmount(latestReport.total_savings || 0)
        setReportDate(new Date(latestReport.created_at).toLocaleDateString())
      }

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single()
      if (profile?.full_name) setDisplayName(profile.full_name)

      setLoading(false)
    }
    init()
  }, [navigate])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function startCheckout(tier) {
    setCheckoutLoading(tier)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Checkout failed:', err)
    }
    setCheckoutLoading(null)
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

  const isActive = status?.subscriptionStatus === 'active'
  const hasAudit = reportDate !== null
  const effectiveSavings = hasAudit && savingsAmount === 0 ? 10 : savingsAmount

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

      {/* CONTACT MODAL */}
      {showContact && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowContact(false) }}>
          <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 12, padding: 32, width: '100%', maxWidth: 480, position: 'relative' }}>
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
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F4F0', marginBottom: 8 }}>Get in touch</h2>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>Tell us about your AWS environment and we'll get back to you within 24 hours.</p>
                <input type="text" placeholder="Your name" value={contactForm.name}
                  onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width: '100%', background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '10px 14px', color: '#F5F4F0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />
                <input type="email" placeholder="Work email" value={contactForm.email}
                  onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                  style={{ width: '100%', background: '#111110', border: '1px solid #2a2a28', borderRadius: 6, padding: '10px 14px', color: '#F5F4F0', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />
                <textarea placeholder="Tell us about your AWS setup — number of accounts, rough monthly spend, main services used." rows={4}
                  value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
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

      {/* ── MAIN ── */}
      <main style={{ marginLeft: isMobile ? 0 : 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0, overflowX: 'hidden' }}>
        <div style={{
          padding: '20px 32px', borderBottom: '1px solid #1E1E1C',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em' }}>
            Billing
          </h1>
        </div>

        <div style={{ padding: isMobile ? '16px 16px 70px' : 32, flex: 1, maxWidth: 720 }}>

          {/* Active subscription */}
          {isActive ? (
            <div style={{
              backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 12, padding: '28px 32px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 18, color: '#34D399' }}>✓</span>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em' }}>
                  Active {status.tier?.charAt(0).toUpperCase() + status.tier?.slice(1)} Plan
                </h2>
              </div>
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
                Your plan is active. You're on the {status.tier} plan — {status.tier === 'team' ? '15%' : '20%'} of verified monthly savings.
              </p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#F5F4F0', margin: '0 0 8px' }}>
                  Plans & Billing
                </h2>
                <p style={{ color: '#6B7280', fontSize: 14, margin: 0, lineHeight: 1.7 }}>
                  Success-based pricing — we only charge when we save you money.
                </p>
              </div>

              {!hasAudit ? (
                <div style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 8, padding: '16px 20px', marginBottom: 24,
                  fontSize: 14, color: '#9CA3AF',
                }}>
                  ⚠️ No audit found.{' '}
                  <a href="/dashboard" style={{ color: '#3B82F6' }}>Run an audit first</a>
                  {' '}to see your potential savings before choosing a plan.
                </div>
              ) : savingsAmount > 0 ? (
                <div style={{
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 8, padding: '16px 20px', marginBottom: 24,
                  fontSize: 14, color: '#9CA3AF',
                }}>
                  Based on your last audit ({reportDate}), we identified{' '}
                  <span style={{ color: '#22C55E', fontWeight: 600 }}>
                    ${savingsAmount.toLocaleString()}/mo
                  </span>{' '}
                  in potential savings.
                </div>
              ) : (
                <div style={{
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 8, padding: '14px 18px', marginBottom: 24,
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                  <span style={{ color: '#3B82F6', fontSize: 16, marginTop: 1 }}>ℹ</span>
                  <span style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.5 }}>
                    You only pay when we find real savings. Your plan activates automatically after your first audit identifies waste in your AWS account.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Standard */}
                <div style={{
                  backgroundColor: '#0D0D0D', border: '1px solid #1E1E1C',
                  borderRadius: 12, padding: '24px 28px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 16, flexWrap: 'wrap',
                  transition: 'border-color 200ms',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#2A2A28'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1E1E1C'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#F5F4F0', letterSpacing: '-0.02em' }}>Standard</span>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>— For startups and small teams</span>
                    </div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#F5F4F0', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                      20% <span style={{ fontSize: 14, fontWeight: 400, color: '#6B7280' }}>of verified savings</span>
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {['Up to 3 AWS accounts', 'Full AI audit', 'Monthly re-scans'].map(f => (
                        <li key={f} style={{ fontSize: 13, color: '#888884', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ color: '#3B82F6', fontSize: 12 }}>✓</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => startCheckout('standard')}
                    disabled={!!checkoutLoading || !hasAudit}
                    style={{
                      backgroundColor: checkoutLoading === 'standard' ? '#2563EB' : '#3B82F6',
                      color: '#fff', border: 'none', borderRadius: 8,
                      padding: '10px 22px', fontSize: 14, fontWeight: 600,
                      cursor: (checkoutLoading || !hasAudit) ? 'not-allowed' : 'pointer',
                      opacity: (checkoutLoading && checkoutLoading !== 'standard') || !hasAudit ? 0.4 : 1,
                      whiteSpace: 'nowrap', flexShrink: 0,
                      transition: 'transform 150ms, box-shadow 150ms',
                    }}
                    onMouseEnter={e => { if (!checkoutLoading && hasAudit) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    {checkoutLoading === 'standard' ? 'Redirecting…' : !hasAudit ? 'Run an audit first' : 'Start Standard Plan (20% of savings)'}
                  </button>
                </div>

                {/* Team */}
                <div style={{
                  backgroundColor: '#0D0D0D', border: '2px solid #3B82F6',
                  borderRadius: 12, padding: '24px 28px', position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 16, flexWrap: 'wrap',
                  transition: 'border-color 200ms',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#60A5FA'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#3B82F6'}
                >
                  <div style={{
                    position: 'absolute', top: -1, left: 28,
                    backgroundColor: '#3B82F6', color: '#fff',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    padding: '3px 10px', borderRadius: '0 0 6px 6px', textTransform: 'uppercase',
                  }}>
                    Most Popular
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#F5F4F0', letterSpacing: '-0.02em' }}>Team</span>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>— For growing engineering teams</span>
                    </div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#F5F4F0', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                      15% <span style={{ fontSize: 14, fontWeight: 400, color: '#6B7280' }}>of verified savings</span>
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {['Unlimited accounts', 'Slack alerts', 'Priority support'].map(f => (
                        <li key={f} style={{ fontSize: 13, color: '#888884', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ color: '#3B82F6', fontSize: 12 }}>✓</span>{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => startCheckout('team')}
                    disabled={!!checkoutLoading || !hasAudit}
                    style={{
                      backgroundColor: checkoutLoading === 'team' ? '#2563EB' : '#3B82F6',
                      color: '#fff', border: 'none', borderRadius: 8,
                      padding: '10px 22px', fontSize: 14, fontWeight: 600,
                      cursor: (checkoutLoading || !hasAudit) ? 'not-allowed' : 'pointer',
                      opacity: (checkoutLoading && checkoutLoading !== 'team') || !hasAudit ? 0.4 : 1,
                      whiteSpace: 'nowrap', flexShrink: 0,
                      transition: 'transform 150ms, box-shadow 150ms',
                    }}
                    onMouseEnter={e => { if (!checkoutLoading && hasAudit) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    {checkoutLoading === 'team' ? 'Redirecting…' : !hasAudit ? 'Run an audit first' : 'Start Team Plan (15% of savings)'}
                  </button>
                </div>

              </div>

              <p style={{ fontSize: 12, color: '#555552', marginTop: 20, lineHeight: 1.6 }}>
                Payments processed securely by Stripe. You'll be redirected to Stripe Checkout to complete setup.
              </p>

              <div style={{ textAlign: 'center', marginTop: 32, color: '#6b7280', fontSize: 13 }}>
                Need help choosing?{' '}
                <button onClick={() => { setShowContact(true); setContactSent(false); setContactForm({ name: '', email: '', message: '' }) }}
                  style={{ background: 'none', border: 'none', color: '#3B82F6', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                  Contact us
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
    </div>
  )
}
