import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const CF_TEMPLATE_URL = 'https://vaultixai.app/cloudformation/vaultix-read-only-role.yaml'

const geistFontLink = document.createElement('link')
geistFontLink.rel = 'stylesheet'
geistFontLink.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;900&display=swap'
if (!document.head.querySelector('[href*="Geist"]')) {
  document.head.appendChild(geistFontLink)
}

export default function ConnectAWS() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [accountId, setAccountId] = useState('')
  const [accountIdError, setAccountIdError] = useState('')
  const [accountIdFocused, setAccountIdFocused] = useState(false)
  const [copied, setCopied] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState(null) // 'success' | 'error'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login')
      else setLoading(false)
    })
  }, [navigate])

  function handleAccountIdNext(e) {
    e.preventDefault()
    if (!/^\d{12}$/.test(accountId)) {
      setAccountIdError('AWS Account ID must be exactly 12 digits.')
      return
    }
    setAccountIdError('')
    setStep(2)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(CF_TEMPLATE_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleVerify() {
    setVerifying(true)
    setVerifyStatus(null)
    const roleArn = `arn:aws:iam::${accountId}:role/VaultixReadOnlyRole`
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/aws/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ accountId, roleArn }),
      })
      if (res.ok) {
        // Save account to Supabase — ignore duplicate errors so we don't block the user
        await supabase.from('aws_accounts').insert({
          user_id: session?.user?.id,
          account_name: 'My AWS Account',
          role_arn: roleArn,
        })
        setVerifyStatus('success')
      } else {
        setVerifyStatus('error')
      }
    } catch {
      setVerifyStatus('error')
    }
    setVerifying(false)
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

  const roleArn = `arn:aws:iam::${accountId}:role/VaultixReadOnlyRole`

  return (
    <div style={{
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
      backgroundColor: '#111110', color: '#F5F4F0', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Nav */}
      <nav style={{
        padding: '20px 40px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid #1E1E1C',
      }}>
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3B82F6',
            boxShadow: '0 0 8px rgba(59,130,246,0.8), 0 0 16px rgba(59,130,246,0.4)',
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em', color: '#F5F4F0' }}>
            Vaultix AI
          </span>
        </Link>
        <Link to="/dashboard" style={{ fontSize: 13, color: '#666662', textDecoration: 'none' }}
          onMouseEnter={e => e.target.style.color = '#F5F4F0'}
          onMouseLeave={e => e.target.style.color = '#666662'}>
          ← Back to Dashboard
        </Link>
      </nav>

      {/* Main */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '60px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 520 }}>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  backgroundColor: n === step ? '#3B82F6' : n < step ? 'rgba(59,130,246,0.2)' : '#1A1A18',
                  border: n < step ? '1px solid rgba(59,130,246,0.4)' : n === step ? 'none' : '1px solid #2A2A28',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                  color: n === step ? '#fff' : n < step ? '#3B82F6' : '#555552',
                  transition: 'all 200ms',
                }}>
                  {n < step ? '✓' : n}
                </div>
                {n < 3 && (
                  <div style={{
                    width: 40, height: 1,
                    backgroundColor: n < step ? 'rgba(59,130,246,0.4)' : '#1E1E1C',
                    transition: 'background-color 200ms',
                  }} />
                )}
              </div>
            ))}
            <span style={{ fontSize: 12, color: '#666662', marginLeft: 4 }}>
              Step {step} of 3
            </span>
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#3B82F6', textTransform: 'uppercase', marginBottom: 12 }}>
                STEP 1
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#F5F4F0', margin: '0 0 8px' }}>
                Enter your AWS Account ID
              </h1>
              <p style={{ color: '#666662', fontSize: 14, lineHeight: 1.7, margin: '0 0 32px' }}>
                You can find your 12-digit Account ID in the top-right corner of the AWS console.
              </p>

              <form onSubmit={handleAccountIdNext} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#888884', marginBottom: 6 }}>
                    AWS Account ID
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    required
                    value={accountId}
                    onChange={e => { setAccountId(e.target.value.replace(/\D/g, '')); setAccountIdError('') }}
                    onFocus={() => setAccountIdFocused(true)}
                    onBlur={() => setAccountIdFocused(false)}
                    placeholder="123456789012"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      backgroundColor: '#0D0D0D',
                      border: `1px solid ${accountIdError ? 'rgba(239,68,68,0.5)' : accountIdFocused ? '#3B82F6' : '#222220'}`,
                      borderRadius: 8, padding: '10px 14px',
                      fontSize: 14, color: '#F5F4F0', outline: 'none',
                      fontFamily: 'monospace', letterSpacing: '0.05em',
                      transition: 'border-color 150ms',
                    }}
                  />
                  {accountIdError && (
                    <p style={{ fontSize: 13, color: '#FCA5A5', marginTop: 6 }}>{accountIdError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  style={{
                    backgroundColor: '#3B82F6', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '11px 0', fontSize: 15, fontWeight: 600,
                    cursor: 'pointer', transition: 'transform 150ms, box-shadow 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  Next →
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#3B82F6', textTransform: 'uppercase', marginBottom: 12 }}>
                STEP 2
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#F5F4F0', margin: '0 0 8px' }}>
                Deploy the IAM role
              </h1>
              <p style={{ color: '#666662', fontSize: 14, lineHeight: 1.7, margin: '0 0 28px' }}>
                This creates a read-only IAM role that lets Vaultix AI scan your account. We never write to your infrastructure.
              </p>

              {/* Instructions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {[
                  'Log into your AWS account and go to CloudFormation',
                  'Create a new stack using the template URL below',
                  'This creates a read-only IAM role that lets Vaultix AI scan your account',
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#3B82F6', marginTop: 1,
                    }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 14, color: '#888884', lineHeight: 1.6, margin: 0 }}>{step}</p>
                  </div>
                ))}
              </div>

              {/* Template URL */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#888884', marginBottom: 6 }}>
                  CloudFormation Template URL
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  backgroundColor: '#0D0D0D', border: '1px solid #222220', borderRadius: 8, overflow: 'hidden',
                }}>
                  <span style={{
                    flex: 1, padding: '10px 14px', fontSize: 13, color: '#888884',
                    fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {CF_TEMPLATE_URL}
                  </span>
                  <button
                    onClick={handleCopy}
                    style={{
                      flexShrink: 0, padding: '10px 16px',
                      backgroundColor: copied ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.08)',
                      border: 'none', borderLeft: '1px solid #222220',
                      color: copied ? '#6EE7B7' : '#3B82F6',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    flex: '0 0 auto', backgroundColor: 'transparent', color: '#666662',
                    border: '1px solid #1E1E1C', borderRadius: 8, padding: '11px 20px',
                    fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'border-color 150ms, color 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B3B38'; e.currentTarget.style.color = '#F5F4F0' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1C'; e.currentTarget.style.color = '#666662' }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  style={{
                    flex: 1, backgroundColor: '#3B82F6', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '11px 0', fontSize: 15, fontWeight: 600,
                    cursor: 'pointer', transition: 'transform 150ms, box-shadow 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  I've deployed the role →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#3B82F6', textTransform: 'uppercase', marginBottom: 12 }}>
                STEP 3
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#F5F4F0', margin: '0 0 8px' }}>
                Verify connection
              </h1>
              <p style={{ color: '#666662', fontSize: 14, lineHeight: 1.7, margin: '0 0 28px' }}>
                Confirm your account details below, then verify that the role was deployed correctly.
              </p>

              {/* Details panel */}
              <div style={{
                backgroundColor: '#0D0D0D', border: '1px solid #1E1E1C',
                borderRadius: 10, padding: '20px 24px', marginBottom: 28,
                display: 'flex', flexDirection: 'column', gap: 16,
              }}>
                <DetailRow label="AWS Account ID" value={accountId} mono />
                <div style={{ height: 1, backgroundColor: '#1E1E1C' }} />
                <DetailRow label="IAM Role ARN" value={roleArn} mono />
              </div>

              {/* Status messages */}
              {verifyStatus === 'success' && (
                <div style={{
                  backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                  borderRadius: 8, padding: '14px 16px', marginBottom: 20,
                  color: '#6EE7B7', fontSize: 14, fontWeight: 500,
                }}>
                  ✓ Connected! Your account is being scanned.
                </div>
              )}
              {verifyStatus === 'error' && (
                <div style={{
                  backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 8, padding: '14px 16px', marginBottom: 20,
                  color: '#FCA5A5', fontSize: 14,
                }}>
                  Could not connect. Make sure the CloudFormation stack deployed successfully.
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                {verifyStatus !== 'success' && (
                  <button
                    onClick={() => setStep(2)}
                    style={{
                      flex: '0 0 auto', backgroundColor: 'transparent', color: '#666662',
                      border: '1px solid #1E1E1C', borderRadius: 8, padding: '11px 20px',
                      fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'border-color 150ms, color 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B3B38'; e.currentTarget.style.color = '#F5F4F0' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1C'; e.currentTarget.style.color = '#666662' }}
                  >
                    ← Back
                  </button>
                )}
                {verifyStatus === 'success' ? (
                  <Link
                    to="/dashboard"
                    style={{
                      flex: 1, backgroundColor: '#3B82F6', color: '#fff',
                      borderRadius: 8, padding: '11px 0', fontSize: 15, fontWeight: 600,
                      textDecoration: 'none', textAlign: 'center', display: 'block',
                      transition: 'transform 150ms, box-shadow 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    Go to Dashboard →
                  </Link>
                ) : (
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    style={{
                      flex: 1, backgroundColor: verifying ? '#2563EB' : '#3B82F6', color: '#fff',
                      border: 'none', borderRadius: 8, padding: '11px 0',
                      fontSize: 15, fontWeight: 600,
                      cursor: verifying ? 'not-allowed' : 'pointer',
                      opacity: verifying ? 0.7 : 1,
                      transition: 'transform 150ms, box-shadow 150ms',
                    }}
                    onMouseEnter={e => { if (!verifying) { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59,130,246,0.4)' } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    {verifying ? 'Verifying…' : 'Verify Connection'}
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#555552', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#F5F4F0', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
        {value}
      </div>
    </div>
  )
}
