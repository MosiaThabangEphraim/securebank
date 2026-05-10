import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppShell } from '../components/layout/AppShell'
import { BalanceCard } from '../components/dashboard/BalanceCard'
import { AddAccountModal } from '../components/dashboard/AddAccountModal'
import { api } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import type { Account } from '../types'
import { Plus, Landmark, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

export const Accounts: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [closeAccount, setCloseAccount] = useState<Account | null>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }

    const load = async () => {
      try {
        const { data } = await api.get('/accounts')
        setAccounts(data as Account[])
      } catch (err) {
        console.error('Failed to load accounts:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, authLoading, navigate])

  const handleRemoveAccount = (accountId: string) => {
    if (accounts.length <= 1) { toast.error('You must keep at least one account'); return }
    const account = accounts.find(a => a.id === accountId)
    if (!account) return
    if (account.balance > 1 || account.availableBalance > 1) {
      toast.error('Cannot close an account with a balance above R1 — please withdraw remaining funds first')
      return
    }
    if (account.balance < 0 || account.availableBalance < 0) {
      toast.error('Cannot close an account with a negative balance — please clear the outstanding amount first')
      return
    }
    setCloseAccount(account)
  }

  const confirmClose = async () => {
    if (!closeAccount) return
    setClosing(true)
    try {
      await api.patch(`/accounts/${closeAccount.id}`, { status: 'closed' })
      setAccounts(prev => prev.map(a => a.id === closeAccount.id ? { ...a, status: 'closed' } : a))
      setCloseAccount(null)
      toast.success('Account closed')
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to close account')
    } finally {
      setClosing(false)
    }
  }

  const handleReopenAccount = async (accountId: string) => {
    try {
      await api.patch(`/accounts/${accountId}`, { status: 'active' })
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, status: 'active' } : a))
      toast.success('Account reopened')
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to reopen account')
    }
  }

  const totalBalance = accounts.filter(a => a.status === 'active').reduce((s, a) => s + a.availableBalance, 0)

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="p-6 space-y-6">
          <div className="h-8 w-40 bg-dark-800 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-52 rounded-2xl bg-dark-850 animate-pulse" />)}
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">My Accounts</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {accounts.filter(a => a.status === 'active').length} active account{accounts.filter(a => a.status === 'active').length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" /> Open Account
          </button>
        </div>

        {/* Total balance summary */}
        {accounts.length > 0 && (
          <div className="card px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Available Balance</p>
              <p className="text-2xl font-bold text-white text-amount tracking-tight">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
        )}

        {/* Empty */}
        {accounts.length === 0 && (
          <div className="card p-14 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Landmark className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">No accounts yet</p>
              <p className="text-sm text-gray-500 mt-1">Open your first account to start banking</p>
            </div>
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Open Account
            </button>
          </div>
        )}

        {/* Account cards */}
        {accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {accounts.map(account => (
              <BalanceCard
                key={account.id}
                account={account}
                onRemove={accounts.filter(a => a.status !== 'closed').length > 1
                  ? () => handleRemoveAccount(account.id)
                  : undefined}
                onReopen={() => handleReopenAccount(account.id)}
              />
            ))}
            <button
              onClick={() => setShowAdd(true)}
              className="min-h-[200px] rounded-2xl border-2 border-dashed border-dark-700 hover:border-blue-500/40 hover:bg-blue-500/5 flex flex-col items-center justify-center gap-3 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-dark-800 group-hover:bg-blue-500/20 border border-dark-700 group-hover:border-blue-500/40 flex items-center justify-center transition-all">
                <Plus className="w-6 h-6 text-gray-600 group-hover:text-blue-400 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-500 group-hover:text-gray-300 transition-colors">Open Account</p>
                <p className="text-xs text-gray-600">Cheque, savings or credit</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {user && (
        <AddAccountModal
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          userId={user.id}
          onCreated={account => setAccounts(prev => [account, ...prev])}
        />
      )}

      {/* Close account confirmation */}
      {closeAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-dark-900 border border-dark-700 shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Close account?</h3>
              <p className="text-sm text-gray-400">
                <span className="font-semibold text-white">{closeAccount.accountName}</span> will be permanently closed.
                This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setCloseAccount(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-600 text-gray-300 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmClose}
                disabled={closing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-sm font-semibold transition-all disabled:opacity-50"
              >
                {closing
                  ? <><span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />Closing…</>
                  : 'Yes, Close Account'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
