import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useUserPlan() {
  const [plan, setPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    async function fetchPlan() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setPlanLoading(false); return }
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
      setPlan(data?.plan ?? null)
      setPlanLoading(false)
    }
    fetchPlan()
  }, [])

  const isPaid = plan === 'standard' || plan === 'team' || plan === 'enterprise'
  const isFree = !isPaid

  return { plan, planLoading, isPaid, isFree }
}
