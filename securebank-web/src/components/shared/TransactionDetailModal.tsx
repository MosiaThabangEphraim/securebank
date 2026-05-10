import { X, ArrowUpRight, ArrowDownLeft, Hash, Calendar, CreditCard, Building2, FileText, ExternalLink } from 'lucide-react'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useNavigate } from 'react-router-dom'
import type { Transaction } from '../../types'

interface Props {
  tx: Transaction | null
  onClose: () => void
}

export const TransactionDetailModal: React.FC<Props> = ({ tx, onClose }) => {
  const navigate = useNavigate()
  if (!tx) return null

  const isDebit = tx.direction === 'debit'
  const statusColors: Record<string, string> = {
    posted:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    pending:  'text-blue-400 bg-blue-500/10 border-blue-500/20',
    blocked:  'text-red-400 bg-red-500/10 border-red-500/20',
    disputed: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  }
  const statusClass = statusColors[tx.status] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/20'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-dark-850 border border-dark-700 rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-850 flex items-center justify-between px-6 py-5 border-b border-dark-700/60 z-10">
          <p className="text-sm font-semibold text-white">Transaction Details</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-dark-700 flex items-center justify-center text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Amount hero */}
        <div className="px-6 py-6 text-center border-b border-dark-700/60">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 ${isDebit ? 'bg-red-500/15 border border-red-500/20' : 'bg-emerald-500/15 border border-emerald-500/20'}`}>
            {isDebit ? <ArrowUpRight className="w-7 h-7 text-red-400" /> : <ArrowDownLeft className="w-7 h-7 text-emerald-400" />}
          </div>
          <p className={`text-3xl font-bold text-amount ${isDebit ? 'text-red-400' : 'text-emerald-400'}`}>
            {isDebit ? '-' : '+'}{formatCurrency(tx.amount, tx.currencyCode)}
          </p>
          <p className="text-sm text-gray-400 mt-1">{tx.description ?? 'Transaction'}</p>
          <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-bold border capitalize ${statusClass}`}>
            {tx.status}
          </span>
        </div>
        {/* Details grid */}
        <div className="px-6 py-4 space-y-0 divide-y divide-dark-700/40">
          {([
            tx.referenceNumber  ? { icon: Hash,      label: 'Reference',   value: tx.referenceNumber } : null,
            tx.description      ? { icon: FileText,  label: 'Description', value: tx.description } : null,
            tx.initiatedAt      ? { icon: Calendar,  label: 'Date',        value: formatDate(tx.initiatedAt, 'dd MMM yyyy, HH:mm') } : null,
            tx.postedAt         ? { icon: Calendar,  label: 'Posted',      value: formatDate(tx.postedAt, 'dd MMM yyyy, HH:mm') } : null,
            tx.runningBalance != null ? { icon: CreditCard, label: 'Balance After', value: formatCurrency(tx.runningBalance, tx.currencyCode) } : null,
            tx.isInternational  ? { icon: Building2, label: 'Type',        value: 'International Transaction' } : null,
            tx.notes            ? { icon: FileText,  label: 'Notes',       value: tx.notes } : null,
          ] as ({ icon: React.ElementType; label: string; value: string } | null)[])
            .filter((r): r is { icon: React.ElementType; label: string; value: string } => r !== null)
            .map((r, i) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <r.icon className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">{r.label}</p>
                  <p className="text-sm text-white mt-0.5 break-words">{r.value}</p>
                </div>
              </div>
            ))
          }
        </div>
        <div className="px-6 pb-5 space-y-2">
          {tx.status === 'disputed' && (
            <button
              onClick={() => { onClose(); navigate('/dispute-portal') }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-400 font-semibold text-sm transition-all"
            >
              <ExternalLink className="w-4 h-4" /> View in Disputes
            </button>
          )}
          <button onClick={onClose} className="w-full btn-secondary text-sm py-2.5">Close</button>
        </div>
      </div>
    </div>
  )
}
