import { useState } from 'react'
import { Eye, EyeOff, Wifi, X, RotateCcw } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import type { Account } from '../../types'

interface BalanceCardProps {
  account: Account
  onRemove?: () => void
  onReopen?: () => void
}

const cardGradients: Record<string, string> = {
  cheque: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #312e81 100%)',
  savings: 'linear-gradient(135deg, #065f46 0%, #0d9488 50%, #0e7490 100%)',
  credit: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 50%, #4c1d95 100%)',
}

const cardAccent: Record<string, string> = {
  cheque: 'from-blue-400/20 to-transparent',
  savings: 'from-emerald-400/20 to-transparent',
  credit: 'from-purple-400/20 to-transparent',
}

const typeLabel: Record<string, string> = {
  cheque: 'Cheque Account',
  savings: 'Savings Account',
  credit: 'Credit Account',
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ account, onRemove, onReopen }) => {
  const [hidden, setHidden] = useState(false)

  const gradient = cardGradients[account.accountType] ?? cardGradients.cheque
  const accent = cardAccent[account.accountType] ?? cardAccent.cheque


  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-card-hover cursor-pointer group"
      style={{ background: gradient, minHeight: '200px' }}
    >
      {/* Glossy overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} pointer-events-none`} />

      {/* Circle decorations */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      <div className="relative z-10 p-6 flex flex-col h-full" style={{ minHeight: '200px' }}>
        {/* Top row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-0.5">
              {typeLabel[account.accountType] ?? account.accountType}
            </p>
            <p className="text-white/90 text-xs font-medium">{account.accountName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHidden(!hidden)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white/70 hover:text-white"
            >
              {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            {/* Chip */}
            <div className="w-8 h-6 rounded bg-gradient-to-br from-yellow-300/80 to-yellow-500/60 border border-yellow-200/40 flex items-center justify-center">
              <div className="w-5 h-3.5 rounded-sm border border-yellow-200/60 bg-yellow-400/30" />
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="mb-6">
          <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Available Balance</p>
          <p className="text-3xl font-bold text-white text-amount tracking-tight">
            {hidden ? 'R •••,•••.••' : formatCurrency(account.availableBalance)}
          </p>
          {account.balance !== account.availableBalance && (
            <p className="text-white/40 text-xs mt-1">
              Total: {hidden ? '•••' : formatCurrency(account.balance)}
            </p>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between mt-auto">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Account No.</p>
            <p className="text-white/80 text-xs font-mono tracking-wider">
              {hidden ? '•••• ' + account.accountNumber.slice(-4) : account.accountNumber.slice(-8)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Wifi className="w-4 h-4 text-white/40 rotate-90" />
            <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
              {account.currencyCode}
            </span>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-4 right-4 z-10">
        {account.status === 'active' ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[9px] font-semibold text-emerald-300 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-400/30 text-[9px] font-semibold text-red-300 uppercase tracking-wider">
            {account.status}
          </span>
        )}
      </div>

      {/* Close button (active accounts, hover) */}
      {onRemove && account.status === 'active' && (
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-300"
          title="Close account"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Reopen button (closed accounts, always visible) */}
      {onReopen && account.status === 'closed' && (
        <button
          onClick={e => { e.stopPropagation(); onReopen() }}
          className="absolute bottom-3 right-3 z-10 p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 text-emerald-300 transition-all"
          title="Reopen account"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
