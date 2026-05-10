import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTransactions } from '../hooks/useTransactions'
import { useBeneficiaries } from '../hooks/useBeneficiaries'
import { AppShell } from '../components/layout/AppShell'
import { BalanceCard } from '../components/dashboard/BalanceCard'
import { RecentTransactions } from '../components/dashboard/RecentTransactions'
import { FraudAlertBanner } from '../components/dashboard/FraudAlertBanner'
import { AddAccountModal } from '../components/dashboard/AddAccountModal'
import { TransactModal } from '../components/dashboard/TransactModal'
import { api } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import type { Account } from '../types'
import {
  TrendingUp, TrendingDown, Send, Plus, Users,
  ShieldCheck, Wallet, ArrowUpRight, CreditCard,
  Landmark, ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="card px-5 py-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white text-amount tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Quick action button ──────────────────────────────────────────────────────
function QuickAction({ label, icon: Icon, onClick, to, color }: {
  label: string; icon: React.ElementType
  onClick?: () => void; to?: string; color: string
}) {
  const cls = 'flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-800/60 border border-dark-700/60 hover:border-dark-600 hover:bg-dark-800 transition-all group cursor-pointer'
  const inner = (
    <>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors text-center">{label}</span>
    </>
  )
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  return <button onClick={onClick} className={cls}>{inner}</button>
}

// ─── Onboarding banner ────────────────────────────────────────────────────────
function OnboardingBanner({ onAddAccount }: { onAddAccount: () => void }) {
  return (
    <div className="rounded-2xl border border-blue-500/20 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0D1B3E 0%, #0A1628 60%, #070B14 100%)' }}>
      <div className="p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Landmark className="w-8 h-8 text-blue-400" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-bold text-white mb-1">Welcome to SecureBank!</h3>
          <p className="text-sm text-gray-400">
            You don't have any accounts yet. Open your first account to start banking — it takes less than a minute.
          </p>
        </div>
        <button
          onClick={onAddAccount}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Open Account
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showTransact, setShowTransact]     = useState(false)
  const [reloadKey, setReloadKey]           = useState(0)
  const [closeAccount, setCloseAccount]     = useState<Account | null>(null)
  const [closing, setClosing]               = useState(false)

  const { beneficiaries, addBeneficiary } = useBeneficiaries(user?.id)

  // Load accounts from API
  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }

    api.get('/accounts')
      .then(({ data }) => setAccounts(data as Account[]))
      .catch(err => console.error('Failed to load accounts:', err))
      .finally(() => setLoading(false))
  }, [user?.id, authLoading, navigate, reloadKey])

  const accountIds = useMemo(() => accounts.map(a => a.id), [accounts])
  const { transactions } = useTransactions(accountIds)

  const quarantinedCount = useMemo(
    () => transactions.filter(t => t.status === 'pending').length,
    [transactions]
  )

  const handleRemoveAccount = (accountId: string) => {
    if (accounts.filter(a => a.status !== 'closed').length <= 1) { toast.error('You must keep at least one account'); return }
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

  const thisMonth = useMemo(() => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0)
    const debits  = transactions.filter(t => t.direction === 'debit'  && new Date(t.initiatedAt) >= start).reduce((s, t) => s + t.amount, 0)
    const credits = transactions.filter(t => t.direction === 'credit' && new Date(t.initiatedAt) >= start).reduce((s, t) => s + t.amount, 0)
    return { debits, credits }
  }, [transactions])

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  })()

  // ─── Skeleton while loading ──────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="p-6 space-y-6">
          <div className="h-8 w-48 bg-dark-800 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-dark-850 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-72 rounded-2xl bg-dark-850 animate-pulse lg:col-span-2" />
            <div className="h-72 rounded-2xl bg-dark-850 animate-pulse" />
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {greeting}, {user?.fullName?.split(' ')[0] ?? 'there'} 👋
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddAccount(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Account
            </button>
            <Link to="/review-zone"
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 border border-dark-700 text-gray-400 hover:text-white hover:border-dark-600 transition-all text-sm font-medium">
              <ShieldCheck className="w-4 h-4" /> Security
            </Link>
          </div>
        </div>

        {/* Fraud alert */}
        <FraudAlertBanner quarantinedCount={quarantinedCount} onViewDetails={() => navigate('/review-zone')} />

        {/* No accounts — onboarding */}
        {accounts.length === 0 ? (
          <OnboardingBanner onAddAccount={() => setShowAddAccount(true)} />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Balance"    value={formatCurrency(totalBalance)}         sub={`${accounts.filter(a => a.status === 'active').length} active account${accounts.filter(a => a.status === 'active').length !== 1 ? 's' : ''}`} icon={Wallet}       color="bg-blue-500/15 text-blue-400" />
              <StatCard label="Monthly Income"   value={formatCurrency(thisMonth.credits)}    sub="This month"  icon={TrendingUp}   color="bg-emerald-500/15 text-emerald-400" />
              <StatCard label="Monthly Spend"    value={formatCurrency(thisMonth.debits)}     sub="This month"  icon={TrendingDown}  color="bg-red-500/15 text-red-400" />
              <StatCard label="Transactions"     value={transactions.length.toString()}        sub="All time"    icon={ArrowUpRight}  color="bg-purple-500/15 text-purple-400" />
            </div>

            {/* Account cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">My Accounts</h3>
                <button
                  onClick={() => setShowAddAccount(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Account
                </button>
              </div>
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
                {/* Add account card */}
                <button
                  onClick={() => setShowAddAccount(true)}
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
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RecentTransactions transactions={transactions} loading={false} />
              </div>

              <div className="space-y-4">
                {/* Quick actions */}
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <QuickAction label="Send Money"      icon={Send}        onClick={() => setShowTransact(true)} color="bg-blue-500/15 text-blue-400" />
                    <QuickAction label="Add Account"     icon={Landmark}    onClick={() => setShowAddAccount(true)} color="bg-emerald-500/15 text-emerald-400" />
                    <QuickAction label="Beneficiaries"   icon={Users}       to="/beneficiaries" color="bg-purple-500/15 text-purple-400" />
                    <QuickAction label="My Cards"        icon={CreditCard}  to="/cards"         color="bg-amber-500/15 text-amber-400" />
                  </div>
                </div>

                {/* Security panel */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Security Status</h3>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Fraud Detection',  status: 'Active',   ok: true },
                      { label: 'Device Trust',     status: 'Verified', ok: true },
                      { label: 'Pending Review', status: quarantinedCount > 0 ? `${quarantinedCount} pending` : 'Clear', ok: quarantinedCount === 0 },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{item.label}</span>
                        <span className={`text-xs font-semibold flex items-center gap-1.5 ${item.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.ok ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link to="/review-zone"
                    className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-dark-800 border border-dark-700 text-xs text-gray-400 hover:text-white hover:border-dark-600 transition-all font-medium">
                    Security Centre <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add account modal */}
      {user && (
        <AddAccountModal
          isOpen={showAddAccount}
          onClose={() => setShowAddAccount(false)}
          userId={user.id}
          onCreated={(account) => setAccounts(prev => [account, ...prev])}
        />
      )}

      {/* Transact modal */}
      {user && accounts.length > 0 && (
        <TransactModal
          isOpen={showTransact}
          onClose={() => setShowTransact(false)}
          userId={user.id}
          accounts={accounts}
          beneficiaries={beneficiaries}
          recentTransactions={transactions}
          onBeneficiaryAdd={addBeneficiary}
          onTransactionComplete={() => setReloadKey(k => k + 1)}
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
