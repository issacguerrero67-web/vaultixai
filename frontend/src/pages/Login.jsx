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
  const [forgotPassword, setForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetEmailFocused, setResetEmailFocused] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState('')

  async function handleResetPassword(e) {
    e.preventDefault()
    setResetError('')
    setResetLoading(true)
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'https://vaultixai.app/reset-password',
    })
    setResetLoading(false)
    if (resetErr) {
      setResetError(resetErr.message)
    } else {
      setResetSuccess(true)
    }
  }

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
          {!forgotPassword ? (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                onClick={() => setForgotPassword(true)}
                style={{ background: 'none', border: 'none', color: '#666662', fontSize: 13, cursor: 'pointer', padding: 0, transition: 'color 150ms' }}
                onMouseEnter={e => e.currentTarget.style.color = '#888884'}
                onMouseLeave={e => e.currentTarget.style.color = '#666662'}
              >
                Forgot your password?
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 28, borderTop: '1px solid #1E1E1C', paddingTop: 24 }}>
              <p style={{ fontSize: 14, color: '#888884', margin: '0 0 16px' }}>
                Enter your email and we'll send you a reset link.
              </p>

              {resetSuccess ? (
                <div style={{
                  backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 8, padding: '12px 16px', color: '#6EE7B7', fontSize: 14,
                }}>
                  Check your email for a reset link.
                </div>
              ) : (
                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {resetError && (
                    <div style={{
                      backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 8, padding: '10px 14px', color: '#FCA5A5', fontSize: 13,
                    }}>
                      {resetError}
                    </div>
                  )}
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    onFocus={() => setResetEmailFocused(true)}
                    onBlur={() => setResetEmailFocused(false)}
                    placeholder="you@company.com"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      backgroundColor: '#0D0D0D',
                      border: `1px solid ${resetEmailFocused ? '#3B82F6' : '#222220'}`,
                      borderRadius: 8, padding: '10px 14px',
                      fontSize: 14, color: '#F5F4F0', outline: 'none', transition: 'border-color 150ms',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => { setForgotPassword(false); setResetError('') }}
                      style={{
                        flex: '0 0 auto', backgroundColor: 'transparent', border: '1px solid #222220',
                        borderRadius: 8, padding: '9px 16px', fontSize: 13, color: '#666662',
                        cursor: 'pointer', transition: 'border-color 150ms, color 150ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B3B38'; e.currentTarget.style.color = '#F5F4F0' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#222220'; e.currentTarget.style.color = '#666662' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      style={{
                        flex: 1, backgroundColor: resetLoading ? '#2563EB' : '#3B82F6',
                        color: '#fff', border: 'none', borderRadius: 8,
                        padding: '9px 0', fontSize: 13, fontWeight: 600,
                        cursor: resetLoading ? 'not-allowed' : 'pointer',
                        opacity: resetLoading ? 0.7 : 1, transition: 'opacity 150ms',
                      }}
                    >
                      {resetLoading ? 'Sending…' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
