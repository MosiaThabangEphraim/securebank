import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import type { FraudCase } from '../types'

export const useFraudCases = (userId?: string) => {
  const [cases, setCases] = useState<FraudCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const loadCases = async () => {
      try {
        const { data } = await api.get('/fraud/cases')
        setCases(data as FraudCase[])
      } finally {
        setLoading(false)
      }
    }

    loadCases()

    // Keep Supabase realtime for case status updates
    const subscription = supabase
      .channel(`fraud_cases:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fraud_cases',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as FraudCase
          setCases(prev =>
            prev.map(c => (c.id === updated.id ? updated : c))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [userId])

  return {
    cases,
    loading,
  }
}
