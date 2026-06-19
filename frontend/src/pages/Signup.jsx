import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const geistFontLink = document.createElement('link')
geistFontLink.rel = 'stylesheet'
geistFontLink.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;900&display=swap'
if (!document.head.querySelector('[href*="Geist"]')) {
  document.head.appendChild(geistFontLink)
}

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [nameFocused, setNameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  const inputStyle = (focused) => ({
    width: '100%',
    backgroundColor: '#0D0D0D',
    border: `1px solid ${focused ? '#3B82F6' : '#222220'}`,
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#F5F4F0',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 150ms',
  })

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
            GET STARTED
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em',
            color: '#F5F4F0', margin: '0 0 8px',
          }}>
            Start your free trial
          </h1>

          {/* Subtext */}
          <p style={{ color: '#666662', fontSize: '14px', margin: '0 0 32px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#3B82F6', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}>
              Sign in
            </Link>
          </p>

          {/* Success state */}
          {success ? (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>✉️</div>
              <div style={{ color: '#6EE7B7', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                Check your email
              </div>
              <div style={{ color: '#888884', fontSize: '14px', lineHeight: 1.6 }}>
                Check your email to confirm your account, then sign in.
              </div>
              <Link to="/login" style={{
                display: 'inline-block', marginTop: '16px',
                color: '#3B82F6', fontSize: '14px', textDecoration: 'none', fontWeight: 500,
              }}
                onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                onMouseLeave={e => e.target.style.textDecoration = 'none'}>
                Go to sign in →
              </Link>
            </div>
          ) : (
            <>
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
            {/* Full name */}
            <div>
              <label style={{
                display: 'block', fontSize: '13px', fontWeight: 500,
                color: '#888884', marginBottom: '6px',
              }}>
                Full name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                placeholder="Jane Smith"
                style={inputStyle(nameFocused)}
              />
            </div>

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
                style={inputStyle(emailFocused)}
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
                style={inputStyle(passwordFocused)}
              />
              <p style={{ color: '#666662', fontSize: '12px', marginTop: '6px' }}>8+ characters</p>
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
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
          </form>

          {/* Legal */}
          <p style={{ color: '#666662', fontSize: '12px', textAlign: 'center', marginTop: '20px', lineHeight: 1.6 }}>
            By creating an account you agree to our{' '}
            <a href="#" style={{ color: '#888884', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = '#F5F4F0'}
              onMouseLeave={e => e.target.style.color = '#888884'}>
              Terms
            </a>{' '}and{' '}
            <a href="#" style={{ color: '#888884', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = '#F5F4F0'}
              onMouseLeave={e => e.target.style.color = '#888884'}>
              Privacy Policy
            </a>.
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
