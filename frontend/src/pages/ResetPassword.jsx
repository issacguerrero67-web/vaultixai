import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const geistFontLink = document.createElement('link')
geistFontLink.rel = 'stylesheet'
geistFontLink.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;900&display=swap'
if (!document.head.querySelector('[href*="Geist"]')) {
  document.head.appendChild(geistFontLink)
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPasswordFocused, setNewPasswordFocused] = useState(false)
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase appends access_token and refresh_token to the URL hash
    // after the user clicks the password reset email link.
    const hash = window.location.hash
    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setError('Invalid or expired reset link. Please request a new one.')
          } else {
            setSessionReady(true)
          }
        })
    } else {
      setError('Invalid reset link. Please request a new one.')
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      navigate('/dashboard')
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
      backgroundColor: '#111110', color: '#F5F4F0',
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
    }}>
      {/* Nav */}
      <nav style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #1E1E1C' }}>
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
      </nav>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#3B82F6', textTransform: 'uppercase', marginBottom: 12 }}>
            PASSWORD RESET
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#F5F4F0', margin: '0 0 8px' }}>
            Set a new password
          </h1>
          <p style={{ color: '#666662', fontSize: 14, margin: '0 0 32px' }}>
            Enter your new password below.
          </p>

          {error && (
            <div style={{
              backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '12px 16px', marginBottom: 24,
              color: '#FCA5A5', fontSize: 14, lineHeight: 1.5,
            }}>
              {error}
              {!sessionReady && (
                <div style={{ marginTop: 8 }}>
                  <Link to="/login" style={{ color: '#3B82F6', fontSize: 13 }}>← Back to login</Link>
                </div>
              )}
            </div>
          )}

          {sessionReady && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#888884', marginBottom: 6 }}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  onFocus={() => setNewPasswordFocused(true)}
                  onBlur={() => setNewPasswordFocused(false)}
                  placeholder="••••••••"
                  style={inputStyle(newPasswordFocused)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#888884', marginBottom: 6 }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  placeholder="••••••••"
                  style={inputStyle(confirmPasswordFocused)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: loading ? '#2563EB' : '#3B82F6',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '11px 0', fontSize: 15, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 150ms, transform 150ms, box-shadow 150ms',
                  marginTop: 4,
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {loading ? 'Updating…' : 'Set New Password →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
