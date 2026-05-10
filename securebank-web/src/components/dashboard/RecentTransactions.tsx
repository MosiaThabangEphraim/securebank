import { formatCurrency, formatRelativeTime } from '../../lib/utils'
import type { Transaction } from '../../types'
import { ArrowUpRight, ArrowDownLeft, ShoppingBag, Fuel, Utensils, Wifi, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

interface RecentTransactionsProps {
  transactions: Transaction[]
  loading: boolean
}

const categoryIcon: Record<string, React.ReactNode> = {
  groceries: <ShoppingBag className="w-4 h-4" />,
  fuel: <Fuel className="w-4 h-4" />,
  food: <Utensils className="w-4 h-4" />,
  entertainment: <Wifi className="w-4 h-4" />,
}

const categoryColor: Record<string, string> = {
  groceries: 'bg-emerald-500/15 text-emerald-400',
  fuel: 'bg-orange-500/15 text-orange-400',
  food: 'bg-amber-500/15 text-amber-400',
  entertainment: 'bg-purple-500/15 text-purple-400',
}

const statusDot: Record<string, string> = {
  posted: 'bg-emerald-400',
  pending: 'bg-blue-400',
  blocked: 'bg-red-400',
  disputed: 'bg-purple-400',
}

function MerchantAvatar({ name, category }: { name: string; category?: string }) {
  const cat = (category ?? '').toLowerCase()
  const colorClass = categoryColor[cat] ?? 'bg-blue-500/15 text-blue-400'
  const icon = categoryIcon[cat]
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${colorClass}`}>
      {icon ?? initials}
    </div>
  )
}

function RiskChip({ score }: { score: number }) {
  const cls =
    score <= 30 ? 'risk-low' :
    score <= 60 ? 'risk-medium' :
    score <= 80 ? 'risk-high' : 'risk-critical'
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cls}`}>
      {score}
    </span>
  )
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, loading }) => {
  if (loading) {
    return (
      <div className="card p-6">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-dark-700" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-dark-700 rounded w-32" />
                <div className="h-2 bg-dark-700 rounded w-20" />
              </div>
              <div className="h-4 bg-dark-700 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Recent Transactions</h3>
          <p className="text-xs text-gray-500 mt-0.5">{transactions.length} total</p>
        </div>
        <Link
          to="/transactions"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500 text-sm">No transactions yet</p>
        </div>
      ) : (
        <div className="divide-y divide-dark-700/60">
          {transactions.slice(0, 8).map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-dark-800/50 transition-all cursor-pointer group"
            >
              <MerchantAvatar
                name={tx.merchantName ?? tx.description ?? 'Transfer'}
                category={tx.merchantCategory}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">
                    {tx.merchantName ?? tx.description ?? 'Transfer'}
                  </p>
                  {tx.fraudScore && <RiskChip score={tx.fraudScore.riskScore} />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[tx.status] ?? 'bg-gray-500'}`} />
                  <p className="text-xs text-gray-500 capitalize">{tx.status}</p>
                  <span className="text-gray-700">·</span>
                  <p className="text-xs text-gray-500">{formatRelativeTime(tx.initiatedAt)}</p>
                  {tx.locationCity && (
                    <>
                      <span className="text-gray-700">·</span>
                      <p className="text-xs text-gray-500">{tx.locationCity}</p>
                    </>
                  )}
                </div>
              </div>

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
                <div className="w-6 h-6 rounded-lg flex items-center justify-center">
                  {tx.direction === 'debit'
                    ? <ArrowUpRight className="w-3.5 h-3.5 text-red-400/60" />
                    : <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400/60" />
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
