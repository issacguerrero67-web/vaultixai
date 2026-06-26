import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function AccountSwitcher({ activeAccountId, onAccountChange }) {
  const [accounts, setAccounts] = useState([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    async function fetchAccounts() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('aws_accounts')
        .select('id, account_name, role_arn')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      setAccounts(data || [])
    }
    fetchAccounts()
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeAccount = accounts.find(a => a.id === activeAccountId)
  const extractAccountId = (roleArn) => roleArn?.match(/::(\d+):/)?.[1] || ''

  if (accounts.length === 0) return null

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#1a1a18',
          border: '1px solid #2a2a28',
          borderRadius: 6,
          padding: '7px 12px',
          color: '#F5F4F0',
          fontSize: 13,
          cursor: 'pointer',
          minWidth: 180,
          justifyContent: 'space-between',
          transition: 'border-color 150ms',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3a38'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a28'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
            {activeAccount?.account_name || 'Select Account'}
          </span>
        </div>
        <span style={{ color: '#6b7280', fontSize: 10, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          background: '#1a1a18',
          border: '1px solid #2a2a28',
          borderRadius: 8,
          minWidth: 240,
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #2a2a28' }}>
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, letterSpacing: '0.08em' }}>
              AWS ACCOUNTS
            </span>
          </div>

          {accounts.map(account => (
            <button
              key={account.id}
              onClick={() => {
                onAccountChange(account.id)
                localStorage.setItem('vaultix_active_account', account.id)
                setOpen(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 16px',
                background: account.id === activeAccountId ? 'rgba(59,130,246,0.08)' : 'none',
                border: 'none',
                borderBottom: '1px solid #1e1e1c',
                color: '#F5F4F0',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => { if (account.id !== activeAccountId) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (account.id !== activeAccountId) e.currentTarget.style.background = 'none' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: account.id === activeAccountId ? 600 : 400 }}>
                  {account.account_name}
                </span>
                {extractAccountId(account.role_arn) && (
                  <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>
                    {extractAccountId(account.role_arn)}
                  </span>
                )}
              </div>
              {account.id === activeAccountId && (
                <span style={{ color: '#3B82F6', fontSize: 12 }}>✓</span>
              )}
            </button>
          ))}

          <a
            href="/dashboard/accounts"
            style={{
              display: 'block',
              padding: '10px 16px',
              fontSize: 13,
              color: '#3B82F6',
              textDecoration: 'none',
              borderTop: '1px solid #2a2a28',
            }}
            onClick={() => setOpen(false)}
          >
            + Connect New Account
          </a>
        </div>
      )}
    </div>
  )
}
