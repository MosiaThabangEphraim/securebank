import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { UserFraudPreferences } from '../types'

export const useUserFraudPreferences = (userId?: string) => {
  const [prefs, setPrefs] = useState<UserFraudPreferences | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    api.get('/preferences')
      .then(({ data }) => setPrefs(data as UserFraudPreferences))
      .catch(err => console.error('Failed to load preferences:', err))
      .finally(() => setLoading(false))
  }, [userId])

  return { prefs, loading }
}
