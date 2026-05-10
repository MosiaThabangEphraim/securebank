import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTransactions } from '../hooks/useTransactions'
import { useBeneficiaries } from '../hooks/useBeneficiaries'
import { AppShell } from '../components/layout/AppShell'
import { TransactModal } from '../components/dashboard/TransactModal'
import { TransactionDetailModal } from '../components/shared/TransactionDetailModal'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatRelativeTime, formatDate } from '../lib/utils'
import type { Account, Transaction } from '../types'
import {
  Search, Filter, ArrowUpRight, ArrowDownLeft,
  ShoppingBag, Fuel, Utensils, Wifi, Wallet,
  ChevronDown, X, AlertTriangle, Send, FileDown,
} from 'lucide-react'
import clsx from 'clsx'

// ─── Category icon map ────────────────────────────────────────────────────────
const categoryIcon: Record<string, React.ReactNode> = {
  groceries:     <ShoppingBag className="w-4 h-4" />,
  fuel:          <Fuel className="w-4 h-4" />,
  food:          <Utensils className="w-4 h-4" />,
  entertainment: <Wifi className="w-4 h-4" />,
}

const categoryColor: Record<string, string> = {
  groceries:     'bg-emerald-500/15 text-emerald-400',
  fuel:          'bg-orange-500/15 text-orange-400',
  food:          'bg-amber-500/15 text-amber-400',
  entertainment: 'bg-purple-500/15 text-purple-400',
}

const statusDot: Record<string, string> = {
  posted:   'bg-emerald-400',
  pending:  'bg-blue-400 animate-pulse',
  blocked:  'bg-red-400',
  disputed: 'bg-purple-400',
}

const statusPill: Record<string, string> = {
  posted:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  blocked:  'bg-red-500/10 text-red-400 border-red-500/20',
  disputed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

// ─── Transaction row ──────────────────────────────────────────────────────────
function TxRow({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const cat = (tx.merchantCategory ?? '').toLowerCase()
  const colorClass = categoryColor[cat] ?? 'bg-blue-500/15 text-blue-400'
  const icon = categoryIcon[cat]
  const name = tx.merchantName ?? tx.description ?? 'Transfer'
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div onClick={onClick} className="flex items-center gap-4 px-5 py-3.5 hover:bg-dark-800/40 transition-all cursor-pointer group border-b border-dark-700/50 last:border-0">
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${colorClass}`}>
        {icon ?? initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-white truncate">{name}</p>
          {tx.status === 'pending' && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">
              <AlertTriangle className="w-2.5 h-2.5" /> Review
            </span>
          )}
          {tx.isInternational && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Intl
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[tx.status] ?? 'bg-gray-500'}`} />
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusPill[tx.status] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'} capitalize`}>
            {tx.status}
          </span>
          <span className="text-gray-700 text-xs">·</span>
          <span className="text-xs text-gray-500">{formatRelativeTime(tx.initiatedAt)}</span>
          {tx.locationCity && (
            <>
              <span className="text-gray-700 text-xs">·</span>
              <span className="text-xs text-gray-500">{tx.locationCity}{tx.locationCountry ? `, ${tx.locationCountry}` : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right">
          <p className={clsx(
            'text-sm font-semibold text-amount',
            tx.direction === 'debit' ? 'text-red-400' : 'text-emerald-400'
          )}>
            {tx.direction === 'debit' ? '−' : '+'}{formatCurrency(tx.amount)}
          </p>
          {tx.runningBalance != null && (
            <p className="text-[10px] text-gray-600 text-amount">{formatCurrency(tx.runningBalance)}</p>
          )}
        </div>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0">
          {tx.direction === 'debit'
            ? <ArrowUpRight className="w-3.5 h-3.5 text-red-400/50" />
            : <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400/50" />
          }
        </div>
      </div>
    </div>
  )
}

// ─── Filter chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
        active
          ? 'bg-blue-500 border-blue-500 text-white'
          : 'bg-dark-800 border-dark-700 text-gray-400 hover:border-dark-600 hover:text-white'
      )}
    >
      {label}
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export const Transactions: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [accounts, setAccounts]           = useState<Account[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [showTransact, setShowTransact]   = useState(false)

  const { beneficiaries, addBeneficiary } = useBeneficiaries(user?.id)
  const [showStatementMenu, setShowStatementMenu] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [dirFilter, setDirFilter] = useState<'all' | 'debit' | 'credit'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }

    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAccounts((data ?? []).map((row: Record<string, unknown>) => ({
          id:               row.id as string,
          userId:           row.user_id as string,
          accountNumber:    row.account_number as string,
          accountType:      row.account_type as string,
          accountName:      row.account_name as string,
          balance:          Number(row.balance),
          availableBalance: Number(row.available_balance),
          currencyCode:     (row.currency_code as string) || 'ZAR',
          status:           row.status as string,
          interestRate:     row.interest_rate ? Number(row.interest_rate) : undefined,
          creditLimit:      row.credit_limit  ? Number(row.credit_limit)  : undefined,
          createdAt:        row.created_at as string,
          updatedAt:        row.updated_at as string,
        })))
        setAccountsLoading(false)
      })
  }, [user, authLoading, navigate])

  const accountIds = useMemo(() => accounts.map(a => a.id), [accounts])

  const { transactions, loading: txLoading } = useTransactions(accountIds)
  const loading = authLoading || accountsLoading || txLoading

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (dirFilter !== 'all' && tx.direction !== dirFilter) return false
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const name = (tx.merchantName ?? tx.description ?? '').toLowerCase()
        if (!name.includes(q) && !tx.referenceNumber?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [transactions, dirFilter, statusFilter, search])

  const totals = useMemo(() => ({
    debits:  transactions.filter(t => t.status === 'posted' && t.direction === 'debit').reduce((s, t) => s + t.amount, 0),
    credits: transactions.filter(t => t.status === 'posted' && t.direction === 'credit').reduce((s, t) => s + t.amount, 0),
    pending: transactions.filter(t => t.status === 'pending').length,
  }), [transactions])

  const generateStatement = (days: 30 | 60 | 90) => {
    setShowStatementMenu(false)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const periodTxns = transactions.filter(t => new Date(t.initiatedAt) >= cutoff)
    const postedTxns = periodTxns.filter(t => t.status === 'posted')
    const totalCr = postedTxns.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0)
    const totalDr = postedTxns.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0)
    const totalBal = accounts.reduce((s, a) => s + a.availableBalance, 0)

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>SecureBank Statement — Last ${days} Days</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #111; font-size: 13px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #1a56db; padding-bottom: 16px; }
    .brand { color: #1a56db; font-weight: bold; font-size: 18px; }
    .meta { text-align: right; font-size: 12px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; border-bottom: 1px solid #d1d5db; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
    tr:last-child td { border-bottom: none; }
    .total-row td { font-weight: bold; background: #f9fafb; }
    .debit { color: #dc2626; }
    .credit { color: #16a34a; }
    .note { font-size: 11px; color: #6b7280; margin-bottom: 16px; }
    .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">SecureBank</div>
      <div style="font-size:13px;color:#374151;margin-top:4px;">Account Statement</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px;">Period: Last ${days} days (${formatDate(cutoff.toISOString(), 'dd MMM yyyy')} – ${formatDate(new Date().toISOString(), 'dd MMM yyyy')})</div>
    </div>
    <div class="meta">
      Generated: ${formatDate(new Date().toISOString(), 'dd MMM yyyy, HH:mm')}<br/>
      Transactions: ${periodTxns.length} total (${postedTxns.length} posted)
    </div>
  </div>

  <h2 style="font-size:15px;margin-bottom:12px;">Account Summary</h2>
  <table>
    <thead><tr><th>Account</th><th>Account Number</th><th>Available Balance</th></tr></thead>
    <tbody>
      ${accounts.map(a => `<tr><td>${a.accountName}</td><td>${a.accountNumber}</td><td>${formatCurrency(a.availableBalance, a.currencyCode)}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="2">Total Balance</td><td>${formatCurrency(totalBal)}</td></tr>
    </tbody>
  </table>

  <h2 style="font-size:15px;margin-bottom:4px;">Transactions</h2>
  <p class="note">Only posted transactions are included. Pending, blocked and disputed transactions are excluded.</p>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description / Merchant</th>
        <th>Reference</th>
        <th>Dr/Cr</th>
        <th>Amount</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${postedTxns.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#9ca3af;">No posted transactions in this period</td></tr>' : postedTxns.map(t => `
        <tr>
          <td>${formatDate(t.initiatedAt, 'dd MMM yyyy')}</td>
          <td>${t.merchantName ?? t.description ?? 'Transfer'}</td>
          <td>${t.referenceNumber ?? '—'}</td>
          <td class="${t.direction === 'debit' ? 'debit' : 'credit'}">${t.direction === 'debit' ? 'Dr' : 'Cr'}</td>
          <td class="${t.direction === 'debit' ? 'debit' : 'credit'}">${formatCurrency(t.amount, t.currencyCode)}</td>
          <td>${t.status}</td>
        </tr>`).join('')}
      <tr class="total-row">
        <td colspan="3">Totals (posted)</td>
        <td></td>
        <td>Cr: ${formatCurrency(totalCr)} / Dr: ${formatCurrency(totalDr)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    SecureBank &mdash; This is an automated statement. For queries, contact support@securebank.co.za
  </div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => win.print(), 500)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 bg-dark-800 rounded-lg animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-dark-850 animate-pulse" />)}
          </div>
          <div className="h-12 rounded-xl bg-dark-850 animate-pulse" />
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-dark-850 animate-pulse" />)}
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="p-6 space-y-5 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Transactions</h2>
            <p className="text-sm text-gray-500 mt-0.5">All your account activity in one place</p>
          </div>
          {accounts.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowStatementMenu(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 border border-dark-700 text-gray-400 hover:text-white hover:border-dark-600 transition-all text-sm font-medium"
                >
                  <FileDown className="w-4 h-4" /> Statement
                  <ChevronDown className={clsx('w-3 h-3 transition-transform', showStatementMenu && 'rotate-180')} />
                </button>
                {showStatementMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-dark-850 border border-dark-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                    {([30, 60, 90] as const).map(d => (
                      <button key={d} onClick={() => generateStatement(d)} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-800 hover:text-white transition-colors">
                        Last {d} days
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowTransact(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Send Money
              </button>
            </div>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="card px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Credits</p>
            <p className="text-xl font-bold text-emerald-400 text-amount">{formatCurrency(totals.credits)}</p>
          </div>
          <div className="card px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Debits</p>
            <p className="text-xl font-bold text-red-400 text-amount">{formatCurrency(totals.debits)}</p>
          </div>
          <div className={clsx('card px-4 py-3', totals.pending > 0 && 'border-blue-500/30')}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">In Review</p>
            <p className={clsx('text-xl font-bold text-amount', totals.pending > 0 ? 'text-blue-400' : 'text-white')}>
              {totals.pending}
            </p>
          </div>
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by merchant or reference..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-dark pl-10 pr-4 w-full"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all',
                showFilters
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                  : 'bg-dark-800 border-dark-700 text-gray-400 hover:text-white hover:border-dark-600'
              )}
            >
              <Filter className="w-4 h-4" />
              Filter
              <ChevronDown className={clsx('w-3 h-3 transition-transform', showFilters && 'rotate-180')} />
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-dark-850 border border-dark-700">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] text-gray-600 uppercase font-semibold tracking-wider">Direction:</span>
                <FilterChip label="All" active={dirFilter === 'all'} onClick={() => setDirFilter('all')} />
                <FilterChip label="Credits" active={dirFilter === 'credit'} onClick={() => setDirFilter('credit')} />
                <FilterChip label="Debits" active={dirFilter === 'debit'} onClick={() => setDirFilter('debit')} />
              </div>
              <div className="w-px bg-dark-700 mx-1 hidden sm:block" />
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] text-gray-600 uppercase font-semibold tracking-wider">Status:</span>
                {['all', 'posted', 'pending', 'blocked', 'disputed'].map(s => (
                  <FilterChip key={s} label={s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transaction list */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-dark-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== transactions.length && ` (filtered from ${transactions.length})`}
            </span>
            {(search || dirFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setDirFilter('all'); setStatusFilter('all') }}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                {transactions.length === 0 ? 'No transactions yet' : 'No matches'}
              </p>
              <p className="text-xs text-gray-500">
                {transactions.length === 0
                  ? 'Your transaction history will appear here once you start transacting.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map(tx => <TxRow key={tx.id} tx={tx} onClick={() => setSelectedTx(tx)} />)}
            </div>
          )}
        </div>
      </div>

      {user && accounts.length > 0 && (
        <TransactModal
          isOpen={showTransact}
          onClose={() => setShowTransact(false)}
          userId={user.id}
          accounts={accounts}
          beneficiaries={beneficiaries}
          recentTransactions={transactions}
          onBeneficiaryAdd={addBeneficiary}
          onTransactionComplete={() => {/* realtime subscription handles the update */}}
        />
      )}

      <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </AppShell>
  )
}
