import { useState, useEffect, useMemo } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import { createAlert } from '../lib/createAlert'
import type { Account, Transaction } from '../types'
import {
  AlertTriangle, CheckCircle, XCircle, Shield,
  Clock, ArrowUpRight, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'

export const ReviewZone: React.FC = () => {
  const { user } = useAuth()
  const [accounts, setAccounts]         = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const [acctRes, txRes] = await Promise.all([
          api.get('/accounts'),
          api.get('/transactions', { params: { status: 'pending' } }),
        ])
        setAccounts(acctRes.data as Account[])
        setTransactions(txRes.data as Transaction[])
      } catch (err) {
        console.error('Failed to load review zone:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map(a => [a.id, a])),
    [accounts]
  )

  const handleApprove = async (tx: Transaction) => {
    setProcessingId(tx.id)
    try {
      await api.patch(`/transactions/${tx.id}/status`, { status: 'posted' })
      setTransactions(prev => prev.filter(t => t.id !== tx.id))
      createAlert({
        userId: tx.userId,
        alertType: 'transaction',
        title: 'Transaction Approved',
        message: `Your pending payment of ${formatCurrency(tx.amount, tx.currencyCode)} has been approved and sent.`,
        transactionId: tx.id,
      }).catch((e: unknown) => toast.error((e as Error).message))
      toast.success(`Transaction approved — ${formatCurrency(tx.amount, tx.currencyCode)} sent`)
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to approve transaction')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (tx: Transaction) => {
    setProcessingId(tx.id)
    try {
      await api.patch(`/transactions/${tx.id}/status`, { status: 'blocked' })
      setTransactions(prev => prev.filter(t => t.id !== tx.id))
      createAlert({
        userId: tx.userId,
        alertType: 'security',
        title: 'Transaction Rejected',
        message: `Your pending payment of ${formatCurrency(tx.amount, tx.currencyCode)} was rejected and blocked.`,
        transactionId: tx.id,
      }).catch((e: unknown) => toast.error((e as Error).message))
      toast.success('Transaction rejected and blocked')
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to reject transaction')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Status bar */}
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-xs text-gray-500">Loading…</span>
          ) : (
            <>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                transactions.length > 0
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {transactions.length > 0
                  ? <><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />{transactions.length} awaiting review</>
                  : <><CheckCircle className="w-3.5 h-3.5" />All clear</>}
              </div>
              <p className="text-xs text-gray-600">
                Approve transactions you trust, or reject ones you don't recognise.
              </p>
            </>
          )}
        </div>

        {/* Skeletons */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-dark-850 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && transactions.length === 0 && (
          <div className="card p-14 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Nothing to review</p>
              <p className="text-sm text-gray-500 mt-1">
                Transactions you put in review will appear here for your approval.
              </p>
            </div>
          </div>
        )}

        {/* Transaction list */}
        {!loading && transactions.length > 0 && (
          <div className="space-y-3">
            {transactions.map(tx => {
              const account = accountMap[tx.accountId]
              const busy = processingId === tx.id
              return (
                <div key={tx.id} className="card p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-white">
                          {tx.description ?? 'Transfer'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border status-pending">
                          {tx.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                        {account && <span>{account.accountName}</span>}
                        <span>{formatDate(tx.initiatedAt, 'dd MMM yyyy · HH:mm')}</span>
                        {tx.referenceNumber && <span>Ref: {tx.referenceNumber}</span>}
                      </div>
                      {tx.notes && (
                        <p className="mt-2 text-xs text-amber-400/80 leading-relaxed bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                          {tx.notes}
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-white text-amount">
                        {formatCurrency(tx.amount, tx.currencyCode)}
                      </p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <ArrowUpRight className="w-3 h-3 text-red-400" />
                        <span className="text-xs text-red-400">Outgoing</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dark-700/40">
                    <p className="text-xs text-gray-600 flex-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Awaiting your decision
                    </p>
                    <button
                      onClick={() => handleReject(tx)}
                      disabled={busy}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(tx)}
                      disabled={busy}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </AppShell>
  )
}
