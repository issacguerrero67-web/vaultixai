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
  { label: 'Connect AWS',  icon: '⊕', path: '/dashboard/connect' },
  { label: 'Settings',     icon: '⊙', path: '/dashboard/settings' },
]

const STAT_CARDS = [
  { label: 'Total Savings Found', value: '$0' },
  { label: 'Accounts Connected',  value: '0' },
  { label: 'Reports Generated',   value: '0' },
  { label: 'Last Scan',           value: 'Never' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [runningAudit, setRunningAudit] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        setUserEmail(session.user.email)
        setLoading(false)
      }
    })
  }, [navigate])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function runAudit() {
    setRunningAudit(true)
    setElapsedSeconds(0)

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

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

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        backgroundColor: '#0D0D0D',
        borderRight: '1px solid #1E1E1C',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
      }}>
        {/* Logo */}
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

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ label, icon, path }) => {
            const active = location.pathname === path
            return (
              <NavItem key={path} label={label} icon={icon} path={path} active={active} />
            )
          })}
        </nav>

        {/* User + Sign out */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1E1E1C' }}>
          <div style={{
            fontSize: '12px', color: '#666662',
            marginBottom: '10px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {userEmail}
          </div>
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
      <main style={{ marginLeft: '240px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

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
              disabled={runningAudit}
              style={{
                backgroundColor: runningAudit ? '#2563EB' : '#3B82F6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: runningAudit ? 'not-allowed' : 'pointer',
                opacity: runningAudit ? 0.7 : 1,
                transition: 'transform 150ms, box-shadow 150ms',
              }}
              onMouseEnter={e => { if (!runningAudit) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' } }}
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
        </div>

        {/* Content */}
        <div style={{ padding: '32px', flex: 1 }}>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
            {STAT_CARDS.map(({ label, value }) => (
              <StatCard key={label} label={label} value={value} />
            ))}
          </div>

          {/* Empty state */}
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
            {/* Icon */}
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              backgroundColor: '#111110',
              border: '1px solid #1E1E1C',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <CloudIcon />
            </div>

            <h2 style={{
              fontSize: '18px', fontWeight: 600, color: '#F5F4F0',
              margin: '0 0 8px', letterSpacing: '-0.02em',
            }}>
              No AWS accounts connected yet
            </h2>
            <p style={{
              color: '#666662', fontSize: '14px', lineHeight: 1.7,
              maxWidth: '380px', margin: '0 0 28px',
            }}>
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
