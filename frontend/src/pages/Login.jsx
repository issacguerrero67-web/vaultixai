import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const geistFontLink = document.createElement('link')
geistFontLink.rel = 'stylesheet'
geistFontLink.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;900&display=swap'
if (!document.head.querySelector('[href*="Geist"]')) {
  document.head.appendChild(geistFontLink)
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div style={{
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
      backgroundColor: '#111110',
      color: '#F5F4F0',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Nav */}
      <nav style={{
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #1E1E1C',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: '#3B82F6',
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.8), 0 0 16px rgba(59, 130, 246, 0.4)',
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '-0.02em', color: '#F5F4F0' }}>
            Vaultix AI
          </span>
        </Link>
      </nav>

      {/* Main */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* Label */}
          <div style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
            color: '#3B82F6', textTransform: 'uppercase', marginBottom: '12px',
          }}>
            WELCOME BACK
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em',
            color: '#F5F4F0', margin: '0 0 8px',
          }}>
            Sign in to your account
          </h1>

          {/* Subtext */}
          <p style={{ color: '#666662', fontSize: '14px', margin: '0 0 32px' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#3B82F6', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}>
              Start your free trial
            </Link>
          </p>

          {/* Error box */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              color: '#FCA5A5',
              fontSize: '14px',
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: '13px', fontWeight: 500,
                color: '#888884', marginBottom: '6px',
              }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="you@company.com"
                style={{
                  width: '100%',
                  backgroundColor: '#0D0D0D',
                  border: `1px solid ${emailFocused ? '#3B82F6' : '#222220'}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: '#F5F4F0',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: '13px', fontWeight: 500,
                color: '#888884', marginBottom: '6px',
              }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  backgroundColor: '#0D0D0D',
                  border: `1px solid ${passwordFocused ? '#3B82F6' : '#222220'}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: '#F5F4F0',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms',
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#2563EB' : '#3B82F6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 0',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 150ms, transform 150ms, box-shadow 150ms',
                marginTop: '4px',
              }}
              onMouseEnter={e => { if (!loading) { e.target.style.transform = 'scale(1.01)'; e.target.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' } }}
              onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = 'none' }}
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          {/* Forgot password */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a href="#" style={{ color: '#666662', fontSize: '13px', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = '#888884'}
              onMouseLeave={e => e.target.style.color = '#666662'}>
              Forgot your password?
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
