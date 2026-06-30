import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
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

const BACKEND_URL = 'https://vaultixai-production.up.railway.app'

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null

// ── STRIPE PAYMENT FORM ──────────────────────────────────────────────────────

function PaymentForm({ amount, savingsFound, onSuccess, onCancel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return

    setPaying(true)
    setPayError('')

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/billing?payment=success`,
      },
    })

    if (error) {
      setPayError(error.message || 'Payment failed. Please try again.')
      setPaying(false)
    }
    // On success Stripe redirects to return_url — no need to handle here
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Audit savings found</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#F5F4F0' }}>${savingsFound.toLocaleString()}/mo</div>
        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
          One-time fee: <span style={{ color: '#3B82F6', fontWeight: 600 }}>${amount.toFixed(2)}</span>
          {' · '}No subscription. No surprises.
        </div>
      </div>

      <form onSubmit={handlePay}>
        <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>

        {payError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
            {payError}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || paying}
          style={{
            width: '100%', background: !stripe || paying ? '#2a2a28' : '#3B82F6',
            color: !stripe || paying ? '#6b7280' : 'white',
            border: 'none', borderRadius: 8, padding: '14px 20px',
            fontSize: 15, fontWeight: 700, cursor: !stripe || paying ? 'not-allowed' : 'pointer',
            marginBottom: 12, transition: 'background 150ms',
          }}
        >
          {paying ? 'Processing…' : `Pay $${amount.toFixed(2)} — Unlock Full Audit`}
        </button>

        <button
          type="button"
          onClick={onCancel}
          style={{ width: '100%', background: 'none', border: '1px solid #2a2a28', borderRadius: 8, padding: '10px', fontSize: 14, color: '#6b7280', cursor: 'pointer' }}
        >
          Cancel
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', marginTop: 16 }}>
          🔒 Secured by Stripe. Your card details never touch our servers.
        </p>
      </form>
    </div>
  )
}

// ── MAIN BILLING PAGE ────────────────────────────────────────────────────────

export default function Billing() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const paymentSuccess = searchParams.get('payment') === 'success'

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [signingOut, setSigningOut] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)

  // Profile / audit data
  const [profile, setProfile] = useState(null)
  const [latestReport, setLatestReport] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])

  // Payment intent flow
  const [clientSecret, setClientSecret] = useState(null)
  const [intentData, setIntentData] = useState(null) // { amount, savings_found, rate }
  const [initiatingPayment, setInitiatingPayment] = useState(false)
  const [paymentIntentError, setPaymentIntentError] = useState('')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadProfile = useCallback(async (session) => {
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, plan_type, audit_unlocked, savings_found, fee_paid, paid_at')
      .eq('id', session.user.id)
      .single()
    setProfile(prof)
    if (prof?.full_name) setDisplayName(prof.full_name)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }
      setUserEmail(session.user.email)

      await loadProfile(session)

      // Load latest audit report
      const { data: report } = await supabase
        .from('audit_reports')
        .select('id, total_savings, created_at, aws_account_id')
        .eq('user_id', session.user.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setLatestReport(report)

      // Load payment history from backend
      try {
        const res = await fetch(`${BACKEND_URL}/api/stripe/payment-history`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })
        const data = await res.json()
        setPaymentHistory(data.payments || [])
      } catch (err) {
        console.error('Failed to load payment history:', err)
      }

      setLoading(false)
    }
    init()
  }, [navigate, loadProfile])

  // Poll for audit_unlocked after redirect back from Stripe
  useEffect(() => {
    if (!paymentSuccess) return
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('profiles')
        .select('audit_unlocked, fee_paid, savings_found, paid_at, plan_type, full_name')
        .eq('id', session.user.id)
        .single()
      if (data?.audit_unlocked || attempts >= 12) {
        clearInterval(poll)
        setProfile(data)
      }
    }, 2500)
    return () => clearInterval(poll)
  }, [paymentSuccess])

  async function startPayment() {
    setPaymentIntentError('')
    setInitiatingPayment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BACKEND_URL}/api/stripe/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ audit_id: latestReport?.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        setPaymentIntentError(data.error || 'Unable to create payment. Please try again.')
        return
      }

      if (data.message === 'no_waste_found') {
        setLatestReport(r => r ? { ...r, total_savings: 0 } : r)
        return
      }

      setClientSecret(data.client_secret)
      setIntentData(data)
    } catch (err) {
      setPaymentIntentError('Something went wrong. Please try again.')
    } finally {
      setInitiatingPayment(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  // ── DETERMINE STATE ────────────────────────────────────────────────────────

  const auditUnlocked = profile?.audit_unlocked ?? false
  const totalSavings = latestReport?.total_savings ?? 0
  const rate = profile?.plan_type === 'team' ? 0.15 : 0.20
  let calculatedFee = totalSavings * rate
  if (totalSavings > 0 && calculatedFee < 19) calculatedFee = 19

  const stripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#3B82F6',
        colorBackground: '#1a1a18',
        colorText: '#F5F4F0',
        colorDanger: '#ef4444',
        fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
        borderRadius: '6px',
      },
    },
  }

  const sidebar = (
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
  )

  const mobileNav = isMobile && (
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
          <Link key={path} to={path} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, textDecoration: 'none',
            color: isActive ? '#3B82F6' : '#6b7280',
            fontSize: 10, fontWeight: isActive ? 600 : 400, minWidth: 48,
          }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const shell = (children) => (
    <div style={{
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
      backgroundColor: '#111110', color: '#F5F4F0',
      minHeight: '100vh', display: 'flex', overflowX: 'hidden',
    }}>
      {sidebar}
      <main style={{ marginLeft: isMobile ? 0 : 240, flex: 1, padding: isMobile ? '16px 16px 80px' : '28px 40px', minWidth: 0 }}>
        <div style={{ maxWidth: 640 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F4F0', margin: 0, letterSpacing: '-0.02em' }}>
              Billing
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
              Only pay when you save. One-time audit fee. No subscription.
            </p>
          </div>
          {children}
        </div>
      </main>
      {mobileNav}
    </div>
  )

  if (loading) return shell(
    <div style={{ color: '#6b7280', fontSize: 14 }}>Loading…</div>
  )

  // Auto-redirect after payment confirmation
  useEffect(() => {
    if (!paymentSuccess || !profile?.audit_unlocked) return
    const t = setTimeout(() => navigate('/dashboard/reports'), 4000)
    return () => clearTimeout(t)
  }, [paymentSuccess, profile?.audit_unlocked, navigate])

  // ── STATE: PAYMENT SUCCESS (redirect back from Stripe) ────────────────────
  if (paymentSuccess) {
    const isConfirmed = profile?.audit_unlocked

    return shell(
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{isConfirmed ? '🎉' : '⏳'}</div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#F5F4F0', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          {isConfirmed ? 'Full audit unlocked!' : 'Confirming payment…'}
        </h2>
        {isConfirmed ? (
          <>
            <p style={{ fontSize: 15, color: '#9ca3af', margin: '0 0 8px' }}>
              You saved <span style={{ color: '#22c55e', fontWeight: 600 }}>${(profile.savings_found || 0).toLocaleString()}</span> per month.
              Your fee was <span style={{ color: '#F5F4F0', fontWeight: 600 }}>${(profile.fee_paid || 0).toFixed(2)}</span>.
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 28px' }}>Redirecting to your findings…</p>
            <Link
              to="/dashboard/reports"
              style={{ background: '#3B82F6', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 600 }}
            >
              View Full Findings →
            </Link>
          </>
        ) : (
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            We're processing your payment. This usually takes a few seconds…
          </p>
        )}
      </div>
    )
  }

  // ── STATE: ALREADY PAID ───────────────────────────────────────────────────
  if (auditUnlocked) {
    const paidDate = profile?.paid_at
      ? new Date(profile.paid_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null

    return shell(
      <>
        {/* Already unlocked banner */}
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 8, padding: '20px 24px', marginBottom: 28,
          display: 'flex', alignItems: 'flex-start', gap: 16,
        }}>
          <span style={{ fontSize: 22 }}>✓</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#F5F4F0', marginBottom: 4 }}>
              Audit unlocked
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>
              {paidDate ? `Unlocked on ${paidDate}.` : 'Your audit is fully unlocked.'}{' '}
              Autopilot AI is available.
            </div>
          </div>
        </div>

        {/* Payment summary */}
        <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#6b7280', marginBottom: 20, textTransform: 'uppercase' }}>
            Payment Summary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
            {[
              { label: 'SAVINGS IDENTIFIED', value: `$${(profile?.savings_found || 0).toLocaleString()}/mo`, color: '#22c55e' },
              { label: 'FEE PAID', value: `$${(profile?.fee_paid || 0).toFixed(2)}`, color: '#F5F4F0' },
              { label: 'AUDIT DATE', value: paidDate || '—', color: '#F5F4F0' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #2a2a28', paddingTop: 20 }}>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
              Ready for another scan? Run a new audit to see your current infrastructure. Each audit is a separate one-time payment based on new savings found.
            </p>
            <Link
              to="/dashboard/reports"
              style={{
                display: 'inline-block', background: '#3B82F6', color: 'white',
                textDecoration: 'none', borderRadius: 6, padding: '10px 18px', fontSize: 14, fontWeight: 600, marginRight: 12,
              }}
            >
              View Full Findings →
            </Link>
            <Link
              to="/dashboard/autopilot"
              style={{
                display: 'inline-block', background: 'transparent', color: '#3B82F6',
                border: '1px solid rgba(59,130,246,0.4)',
                textDecoration: 'none', borderRadius: 6, padding: '10px 18px', fontSize: 14, fontWeight: 600,
              }}
            >
              Open Autopilot AI
            </Link>
          </div>
        </div>

        {/* Pricing info */}
        <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F4F0', marginBottom: 16 }}>How pricing works</div>
          {[
            { icon: '✓', text: 'Free scan — we find the waste, you see category summaries' },
            { icon: '✓', text: 'One-time payment to unlock full findings and Autopilot AI' },
            { icon: '✓', text: '20% of savings found (Standard) · 15% (Team) · $19 minimum' },
            { icon: '✓', text: 'If we find zero waste, you pay nothing' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ color: '#22c55e', fontWeight: 700, flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>{text}</span>
            </div>
          ))}
        </div>
      </>
    )
  }

  // ── STATE: NO AUDIT YET ───────────────────────────────────────────────────
  if (!latestReport) {
    return shell(
      <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F4F0', margin: '0 0 12px' }}>
          No audit yet
        </h2>
        <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 24px', lineHeight: 1.7 }}>
          Connect your AWS account and run your first audit. We'll find waste for free — you only pay when we find real savings.
        </p>
        <Link
          to="/dashboard/connect"
          style={{ display: 'inline-block', background: '#3B82F6', color: 'white', textDecoration: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 600 }}
        >
          Connect AWS Account →
        </Link>
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #2a2a28' }}>
          <PricingInfo />
        </div>
      </div>
    )
  }

  // ── STATE: NO WASTE FOUND ─────────────────────────────────────────────────
  if (totalSavings === 0) {
    return shell(
      <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F4F0', margin: '0 0 12px' }}>
          Great news — no significant waste found!
        </h2>
        <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 8px', lineHeight: 1.7 }}>
          Your account looks clean. No charge today.
        </p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>
          We'll rescan automatically as your infrastructure grows.
        </p>
        <Link
          to="/dashboard/reports"
          style={{ display: 'inline-block', background: '#1a1a18', border: '1px solid #2a2a28', color: '#F5F4F0', textDecoration: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500 }}
        >
          View Audit Report →
        </Link>
      </div>
    )
  }

  // ── STATE: PAYMENT FORM (Stripe Elements) ─────────────────────────────────
  if (clientSecret && intentData) {
    if (!stripePromise) {
      return shell(
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 24, color: '#ef4444', fontSize: 14 }}>
          Stripe is not configured. Please add VITE_STRIPE_PUBLISHABLE_KEY to your environment variables.
        </div>
      )
    }

    return shell(
      <>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F4F0', margin: '0 0 24px', letterSpacing: '-0.02em' }}>
          Unlock Your Full Audit
        </h2>
        <Elements stripe={stripePromise} options={stripeElementsOptions}>
          <PaymentForm
            amount={intentData.amount}
            savingsFound={intentData.savings_found}
            onCancel={() => { setClientSecret(null); setIntentData(null) }}
          />
        </Elements>
      </>
    )
  }

  // ── STATE: FREE USER, AUDIT DONE, SAVINGS FOUND (default) ────────────────
  return shell(
    <>
      {/* Main CTA card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.06) 100%)',
        border: '1px solid rgba(59,130,246,0.3)',
        borderRadius: 12, padding: 32, marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#3B82F6', marginBottom: 16, textTransform: 'uppercase' }}>
          Your AWS Audit is Ready
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#F5F4F0', margin: '0 0 8px', letterSpacing: '-0.03em' }}>
          We found ${totalSavings.toLocaleString()} in potential savings
        </h2>
        <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 24px', lineHeight: 1.6 }}>
          Full findings are locked until payment. Unlock instantly to see exact amounts, resource IDs, and step-by-step fix instructions.
        </p>

        <div style={{ background: '#111110', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Savings identified</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#F5F4F0' }}>${totalSavings.toLocaleString()}/mo</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              Our fee ({profile?.plan_type === 'team' ? '15%' : '20%'} of savings)
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#F5F4F0' }}>${(totalSavings * rate).toFixed(2)}</span>
          </div>
          {calculatedFee > totalSavings * rate && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Minimum fee applies</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>$19</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #2a2a28', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#F5F4F0' }}>One-time fee</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#3B82F6' }}>${calculatedFee.toFixed(2)}</span>
          </div>
        </div>

        {paymentIntentError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
            {paymentIntentError}
          </div>
        )}

        <button
          onClick={startPayment}
          disabled={initiatingPayment}
          style={{
            width: '100%', background: initiatingPayment ? '#2563eb' : '#3B82F6',
            color: 'white', border: 'none', borderRadius: 8, padding: '16px 20px',
            fontSize: 16, fontWeight: 700, cursor: initiatingPayment ? 'not-allowed' : 'pointer',
            marginBottom: 12, transition: 'background 150ms, transform 150ms',
          }}
          onMouseEnter={e => { if (!initiatingPayment) e.currentTarget.style.transform = 'scale(1.01)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {initiatingPayment ? 'Preparing payment…' : `Unlock Full Audit — Pay $${calculatedFee.toFixed(2)}`}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#6b7280', margin: 0 }}>
          One-time payment. No subscription. No surprises. Secured by Stripe.
        </p>
      </div>

      {/* What you get */}
      <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F4F0', marginBottom: 16 }}>What's included</div>
        {[
          { icon: '🔍', label: 'Full findings', desc: 'Exact dollar amounts, resource IDs, and ARNs for every finding' },
          { icon: '📋', label: 'Fix instructions', desc: 'Step-by-step recommendations for each issue' },
          { icon: '✦',  label: 'Autopilot AI', desc: 'Chat with AI about your specific findings and get personalized advice' },
          { icon: '📊', label: 'Report history', desc: 'Access all past audit reports anytime' },
        ].map(({ icon, label, desc }) => (
          <div key={label} style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center' }}>{icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F4F0', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <PricingInfo />
    </>
  )
}

function PricingInfo() {
  return (
    <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Pricing model
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { plan: 'Standard', rate: '20%', accounts: '1 account', color: '#F5F4F0' },
          { plan: 'Team', rate: '15%', accounts: 'Up to 5 accounts', color: '#3B82F6' },
        ].map(({ plan, rate, accounts, color }) => (
          <div key={plan} style={{ background: '#111110', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color, marginBottom: 4 }}>{plan}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#F5F4F0', marginBottom: 2 }}>{rate}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>of savings found</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>{accounts} · $19 minimum</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: '#6b7280', margin: '16px 0 0', lineHeight: 1.6 }}>
        If we find zero waste, you pay nothing. Each audit is a separate one-time payment. No subscriptions, no monthly billing.
      </p>
    </div>
  )
}
