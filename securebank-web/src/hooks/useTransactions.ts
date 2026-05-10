import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import type { Transaction } from '../types'

function mapTransaction(r: Record<string, unknown>): Transaction {
  return {
    id:              r.id as string,
    accountId:       r.accountId as string,
    userId:          r.userId as string,
    cardId:          r.cardId as string | undefined,
    beneficiaryId:   r.beneficiaryId as string | undefined,
    amount:          Number(r.amount),
    direction:       r.direction as string,
    currencyCode:    r.currencyCode as string,
    runningBalance:  r.runningBalance != null ? Number(r.runningBalance) : undefined,
    isInternational: Boolean(r.isInternational),
    status:          r.status as string,
    referenceNumber: r.referenceNumber as string | undefined,
    description:     r.description as string | undefined,
    notes:           r.notes as string | undefined,
    initiatedAt:     r.initiatedAt as string,
    postedAt:        r.postedAt as string | undefined,
    createdAt:       r.createdAt as string,
    updatedAt:       r.updatedAt as string,
  }
}

export const useTransactions = (accountIds?: string[]) => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const instanceId = useRef(Math.random().toString(36).slice(2, 8))

  useEffect(() => {
    if (!accountIds || accountIds.length === 0) {
      setTransactions([])
      setLoading(false)
      return
    }

    const loadTransactions = async () => {
      try {
        const { data } = await api.get('/transactions')
        const all = (data as Record<string, unknown>[]).map(mapTransaction)
        const filtered = all.filter(t => accountIds.includes(t.accountId))
        setTransactions(filtered)
      } catch (err) {
        console.error('Failed to load transactions:', err)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()

    // Keep Supabase realtime for live updates
    const channels = accountIds.map(accountId =>
      supabase
        .channel(`transactions:${accountId}:${instanceId.current}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `account_id=eq.${accountId}`,
          },
          (payload) => {
            const raw = payload.new as Record<string, unknown>
            const mapped: Transaction = {
              id:              raw.id as string,
              accountId:       raw.account_id as string,
              userId:          raw.user_id as string,
              cardId:          raw.card_id as string | undefined,
              beneficiaryId:   raw.beneficiary_id as string | undefined,
              amount:          Number(raw.amount),
              direction:       raw.direction as string,
              currencyCode:    raw.currency_code as string,
              runningBalance:  raw.running_balance != null ? Number(raw.running_balance) : undefined,
              isInternational: Boolean(raw.is_international),
              status:          raw.status as string,
              referenceNumber: raw.reference_number as string | undefined,
              description:     raw.description as string | undefined,
              notes:           raw.notes as string | undefined,
              initiatedAt:     raw.initiated_at as string,
              postedAt:        raw.posted_at as string | undefined,
              createdAt:       raw.created_at as string,
              updatedAt:       raw.updated_at as string,
            }
            if (payload.eventType === 'INSERT') {
              setTransactions(prev =>
                [mapped, ...prev.filter(t => t.id !== mapped.id)]
                  .sort((a, b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime())
              )
            } else if (payload.eventType === 'UPDATE') {
              setTransactions(prev => prev.map(t => t.id === mapped.id ? mapped : t))
            }
          }
        )
        .subscribe()
    )

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [JSON.stringify(accountIds)])

  return { transactions, loading }
}
