import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useUserPlan() {
  const [plan, setPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [auditUnlocked, setAuditUnlocked] = useState(false)
  const [savingsFound, setSavingsFound] = useState(0)
  const [feePaid, setFeePaid] = useState(0)
  const [paidAt, setPaidAt] = useState(null)
  const [planType, setPlanType] = useState('standard')

  useEffect(() => {
    async function fetchPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setPlanLoading(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('plan, plan_type, audit_unlocked, savings_found, fee_paid, paid_at')
        .eq('id', user.id)
        .single()
      setPlan(data?.plan ?? null)
      setPlanType(data?.plan_type ?? 'standard')
      setAuditUnlocked(data?.audit_unlocked ?? false)
      setSavingsFound(data?.savings_found ?? 0)
      setFeePaid(data?.fee_paid ?? 0)
      setPaidAt(data?.paid_at ?? null)
      setPlanLoading(false)
    }
    fetchPlan()
  }, [])

  const isPaid = auditUnlocked
  const isFree = !auditUnlocked

  return {
    plan,
    planType,
    planLoading,
    isPaid,
    isFree,
    auditUnlocked,
    savingsFound,
    feePaid,
    paidAt,
  }
}
