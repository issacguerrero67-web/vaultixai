import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AccountSwitcher from '../components/AccountSwitcher'
import FeatureGate from '../components/FeatureGate'

const geistFontLink = document.createElement('link')
geistFontLink.rel = 'stylesheet'
geistFontLink.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;900&display=swap'
if (!document.head.querySelector('[href*="Geist"]')) {
  document.head.appendChild(geistFontLink)
}

const BACKEND_URL = 'https://vaultixai-production.up.railway.app'

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: '⊡', path: '/dashboard' },
  { label: 'Reports',      icon: '≡', path: '/dashboard/reports' },
  { label: 'Billing',      icon: '◇', path: '/dashboard/billing' },
  { label: 'AWS Accounts', icon: '⊕', path: '/dashboard/accounts' },
  { label: 'Autopilot',    icon: '✦', path: '/dashboard/autopilot' },
  { label: 'Settings',     icon: '⊙', path: '/dashboard/settings' },
]

export default function Autopilot() {
  const navigate = useNavigate()
  const location = useLocation()
  const messagesEndRef = useRef(null)

  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [pageLoading, setPageLoading] = useState(true)

  // Chat state
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  // Account / report context
  const [accounts, setAccounts] = useState([])
  const [activeAccountId, setActiveAccountId] = useState(() => localStorage.getItem('vaultix_active_account') || null)
  const [awsAccount, setAwsAccount] = useState(null)
  const [latestReport, setLatestReport] = useState(null)
  const [userPlan, setUserPlan] = useState(null)
  const isPaid = userPlan === 'standard' || userPlan === 'team' || userPlan === 'enterprise'
  const [hasAutopilotRole, setHasAutopilotRole] = useState(false)

  // Kept for setup banner (unused by chat, but wired to banner button)
  const [setupStep, setSetupStep] = useState(1)
  const [autopilotArn, setAutopilotArn] = useState('')

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, full_name')
        .eq('id', session.user.id)
        .single()

      if (profile?.full_name) setDisplayName(profile.full_name)
      setUserPlan(profile?.plan)

      const { data: allAccounts } = await supabase
        .from('aws_accounts')
        .select('*')
        .eq('user_id', session.user.id)

      setAccounts(allAccounts ?? [])

      const storedId = localStorage.getItem('vaultix_active_account')
      const activeId = storedId && (allAccounts ?? []).find(a => a.id === storedId)
        ? storedId
        : allAccounts?.[0]?.id ?? null
      setActiveAccountId(activeId)

      const account = (allAccounts ?? []).find(a => a.id === activeId) ?? allAccounts?.[0] ?? null
      setAwsAccount(account)
      setHasAutopilotRole(!!account?.autopilot_role_arn)

      let report = null
      if (account) {
        const { data: r } = await supabase
          .from('audit_reports')
          .select('findings, total_savings, created_at')
          .eq('aws_account_id', account.id)
          .eq('user_id', session.user.id)
          .eq('status', 'complete')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        report = r
        setLatestReport(r)
      }

      const findingsCount = report?.findings?.length ?? 0
      const savings = report?.total_savings ?? 0

      // Load saved chat history — skip welcome message if history exists
      const savedMessages = localStorage.getItem('vaultix_chat_history')
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages)
          if (parsed.length > 0) {
            setMessages(parsed)
            setPageLoading(false)
            return
          }
        } catch (e) {
          // Invalid JSON, start fresh
        }
      }

      setMessages([{
        role: 'assistant',
        content: `Hi ${profile?.full_name || 'there'}! I'm your Vaultix AI Assistant. I have full context of your AWS account${account ? ` (${account.account_name})` : ''} and your latest audit findings.\n\n${findingsCount > 0 ? `You have **${findingsCount} findings** with $${savings.toLocaleString()}/mo in potential savings. ` : 'No audit found yet — run one from the Dashboard to unlock personalized recommendations. '}What would you like to know about your AWS costs?`,
      }])

      setPageLoading(false)
    }
    init()
  }, [navigate])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Persist chat history to localStorage on every change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('vaultix_chat_history', JSON.stringify(messages))
    }
  }, [messages])

  async function handleAccountSwitch(accountId) {
    setActiveAccountId(accountId)
    localStorage.setItem('vaultix_active_account', accountId)
    const account = accounts.find(a => a.id === accountId) ?? null
    setAwsAccount(account)
    setHasAutopilotRole(!!account?.autopilot_role_arn)
    setLatestReport(null)
    if (account) {
      const { data: r } = await supabase
        .from('audit_reports')
        .select('findings, total_savings, created_at')
        .eq('aws_account_id', account.id)
        .eq('user_id', (await supabase.auth.getSession()).data.session?.user.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setLatestReport(r ?? null)
    }
  }

  function clearChat() {
    localStorage.removeItem('vaultix_chat_history')
    setMessages([{
      role: 'assistant',
      content: `Hi ${displayName || 'there'}! I'm your Vaultix AI Assistant. How can I help you with your AWS costs today?`,
    }])
  }

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Build conversation history — last 10 msgs, exclude the one we just appended
      const history = newMessages
        .slice(-10)
        .slice(0, -1)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch(`${BACKEND_URL}/api/autopilot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          aws_account_id: awsAccount?.id,
          conversation_history: history,
        }),
      })

      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        throw new Error(data.error || 'No reply')
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    navigate('/login')
  }

  function renderMarkdown(text) {
    return text
      // Bold: **text**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Code block: ```...```
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre style="background:#111110;border:1px solid #2a2a28;border-radius:6px;padding:10px 12px;overflow-x:auto;font-size:12px;line-height:1.5;margin:8px 0"><code>$1</code></pre>')
      // Inline code: `text`
      .replace(/`([^`]+)`/g, '<code style="background:#111110;border:1px solid #2a2a28;border-radius:4px;padding:2px 5px;font-size:12px">$1</code>')
      // Numbered list
      .replace(/^(\d+)\. (.+)$/gm, '<div style="margin:3px 0;padding-left:4px"><strong>$1.</strong> $2</div>')
      // Bullet list
      .replace(/^[•\-\*] (.+)$/gm, '<div style="margin:3px 0;padding-left:8px">• $1</div>')
      // Newlines → <br>
      .replace(/\n/g, '<br/>')
  }

  if (pageLoading) {
    return (
      <div style={{ fontFamily: "'Geist', 'Inter', system-ui, sans-serif", backgroundColor: '#111110', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#666662', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Geist', 'Inter', system-ui, sans-serif", backgroundColor: '#111110', color: '#F5F4F0', minHeight: '100vh', display: 'flex', overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 240, flexShrink: 0, backgroundColor: '#0D0D0D', borderRight: '1px solid #1E1E1C', display: isMobile ? 'none' : 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1E1E1C' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3B82F6', boxShadow: '0 0 8px rgba(59,130,246,0.8), 0 0 16px rgba(59,130,246,0.4)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em', color: '#F5F4F0' }}>Vaultix AI</span>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ label, icon, path }) => {
            const active = location.pathname === path
            return (
              <Link key={path} to={path} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', fontSize: 14, fontWeight: active ? 500 : 400, color: active ? '#3B82F6' : '#888884', textDecoration: 'none', borderLeft: active ? '2px solid #3B82F6' : '2px solid transparent', backgroundColor: active ? 'rgba(59,130,246,0.06)' : 'transparent', transition: 'color 150ms, background-color 150ms' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#F5F4F0'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#888884'; e.currentTarget.style.backgroundColor = 'transparent' } }}>
                <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #1E1E1C' }}>
          {displayName ? (
            <>
              <div style={{ fontSize: 13, color: '#F5F4F0', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#666662', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
          )}
          <button onClick={handleSignOut} disabled={signingOut}
            style={{ width: '100%', backgroundColor: 'transparent', border: '1px solid #1E1E1C', borderRadius: 6, color: '#666662', fontSize: 13, fontWeight: 500, padding: '7px 0', cursor: signingOut ? 'not-allowed' : 'pointer', transition: 'border-color 150ms, color 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B3B38'; e.currentTarget.style.color = '#F5F4F0' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E1E1C'; e.currentTarget.style.color = '#666662' }}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ marginLeft: isMobile ? 0 : 240, flex: 1, padding: isMobile ? '16px 16px 80px' : '28px 32px', minWidth: 0, overflowX: 'hidden', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>

        {/* Status bar */}
        {(awsAccount || accounts.length > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid #2a2a28', fontSize: 13, color: '#6b7280', flexWrap: 'wrap', flexShrink: 0 }}>
            <span style={{ color: '#F5F4F0', fontWeight: 600 }}>✦ Autopilot</span>
            <span style={{ color: '#2a2a28' }}>|</span>
            <AccountSwitcher
              activeAccountId={activeAccountId}
              onAccountChange={handleAccountSwitch}
            />
            {latestReport && (
              <>
                <span style={{ color: '#2a2a28' }}>|</span>
                <span>{latestReport.findings?.length ?? 0} findings</span>
                <span style={{ color: '#2a2a28' }}>|</span>
                <span>Last audit: {new Date(latestReport.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span style={{ color: '#2a2a28' }}>|</span>
                <span style={{ color: '#22c55e', fontWeight: 500 }}>${(latestReport.total_savings ?? 0).toLocaleString()}/mo potential</span>
              </>
            )}
            <button onClick={clearChat}
              style={{ marginLeft: 'auto', background: 'none', border: '1px solid #2a2a28', color: '#6b7280', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', transition: 'border-color 150ms, color 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B3B38'; e.currentTarget.style.color = '#F5F4F0' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a28'; e.currentTarget.style.color = '#6b7280' }}>
              Clear chat
            </button>
          </div>
        )}

        {/* Autopilot role setup banner */}
        {!hasAutopilotRole && awsAccount && (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: '#f59e0b' }}>⚠ Deploy the Autopilot role to enable automated fix execution</span>
            <button
              onClick={() => window.open('https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?templateURL=https://vaultixai-cloudformation-templates.s3.us-east-2.amazonaws.com/vaultix-autopilot-role.yaml&stackName=vaultix-autopilot-role', '_blank')}
              style={{ background: 'none', border: '1px solid rgba(251,191,36,0.4)', color: '#f59e0b', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
              Deploy Now →
            </button>
          </div>
        )}

        {/* No account banner */}
        {!awsAccount && (
          <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>Connect an AWS account to unlock personalized recommendations</span>
            <Link to="/dashboard/connect" style={{ fontSize: 13, fontWeight: 600, color: '#3B82F6', textDecoration: 'none', whiteSpace: 'nowrap' }}>Connect Account →</Link>
          </div>
        )}

        {/* ── CHAT CONTAINER ── */}
        <FeatureGate isPaid={isPaid} message="Upgrade to unlock AI-powered cost optimization chat">
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, marginBottom: 16 }}>

            {/* Suggested questions — shown only before user sends a message */}
            {messages.length === 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {[
                  'What should I fix first?',
                  'How much can I save this month?',
                  'Explain my highest severity finding',
                  'What is an unattached EBS volume?',
                ].map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    style={{ background: '#1a1a18', border: '1px solid #2a2a28', color: '#9ca3af', borderRadius: 20, padding: '8px 14px', fontSize: 13, cursor: 'pointer', transition: 'border-color 150ms, color 150ms' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.color = '#F5F4F0' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a28'; e.currentTarget.style.color = '#9ca3af' }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>
                  {msg.role === 'user' ? 'You' : '✦ Vaultix AI'}
                </div>
                <div style={{
                  maxWidth: isMobile ? '90%' : '75%',
                  background: msg.role === 'user' ? '#3B82F6' : '#1a1a18',
                  border: msg.role === 'user' ? 'none' : '1px solid #2a2a28',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '12px 16px',
                  fontSize: 14,
                  color: '#F5F4F0',
                  lineHeight: 1.6,
                  whiteSpace: msg.role === 'user' ? 'pre-wrap' : undefined,
                  wordBreak: 'break-word',
                }}>
                  {msg.role === 'user'
                    ? msg.content
                    : <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  }
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>✦ Vaultix AI</div>
                  <div style={{ background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: '12px 12px 12px 2px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{ borderTop: '1px solid #2a2a28', paddingTop: 16, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your AWS costs..."
                rows={1}
                style={{ flex: 1, background: '#1a1a18', border: '1px solid #2a2a28', borderRadius: 8, padding: '12px 14px', color: '#F5F4F0', fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit', maxHeight: 120, overflowY: 'auto', transition: 'border-color 150ms' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#3B82F6' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#2a2a28' }}
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                style={{ background: input.trim() && !loading ? '#3B82F6' : '#2a2a28', color: input.trim() && !loading ? 'white' : '#444', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', transition: 'background 0.15s', whiteSpace: 'nowrap' }}>
                Send →
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#444', marginTop: 8, textAlign: 'center' }}>
              Press Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
        </FeatureGate>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1a1a18', borderTop: '1px solid #2a2a28', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 0 12px', zIndex: 1000 }}>
          {[
            { label: 'Dashboard', path: '/dashboard', icon: '⊡' },
            { label: 'Reports',   path: '/dashboard/reports', icon: '≡' },
            { label: 'Autopilot', path: '/dashboard/autopilot', icon: '✦' },
            { label: 'Accounts',  path: '/dashboard/accounts', icon: '⊕' },
            { label: 'Settings',  path: '/dashboard/settings', icon: '⊙' },
          ].map(({ label, path, icon }) => {
            const isActive = window.location.pathname === path
            return (
              <a key={path} href={path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none', color: isActive ? '#3B82F6' : '#6b7280', fontSize: 10, fontWeight: isActive ? 600 : 400, minWidth: 48 }}>
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
