import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { Account, AccountSummaryDto } from '../types'

export const useAccount = (accountId?: string) => {
  const [account, setAccount] = useState<Account | null>(null)
  const [summary, setSummary] = useState<AccountSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) {
      setLoading(false)
      return
    }

    const loadAccount = async () => {
      try {
        const { data } = await api.get<Account>(`/accounts/${accountId}`)
        setAccount(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load account')
      } finally {
        setLoading(false)
      }
    }

    loadAccount()
  }, [accountId])

  const loadSummary = async () => {
    if (!accountId) return
    try {
      const { data } = await api.get<AccountSummaryDto>(`/accounts/${accountId}/summary`)
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account summary')
    }
  }

  return {
    account,
    summary,
    loading,
    error,
    loadSummary,
  }
}
