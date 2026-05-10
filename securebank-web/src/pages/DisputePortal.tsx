import { useState, useEffect } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import type { FraudCase, Transaction } from '../types'
import {
  Shield, ChevronDown, ChevronRight, AlertTriangle,
  Hash, FileText, Clock, ArrowUpRight,
} from 'lucide-react'

interface CaseWithTx extends FraudCase {
  tx?: Transaction
}

function CaseCard({ c, expanded, onToggle }: {
  c: CaseWithTx
  expanded: boolean
  onToggle: () => void
}) {
  const slaDate    = new Date(c.slaDeadline)
  const now        = new Date()
  const slaExpired = slaDate < now
  const daysLeft   = Math.ceil((slaDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="card overflow-hidden transition-all">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-dark-800/40 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">
              {c.caseNumber ?? `CASE-${c.id.slice(0, 8).toUpperCase()}`}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border status-quarantined">
              {c.status.toUpperCase()}
            </span>
            {c.tx && (
              <span className="text-xs text-red-400 font-semibold text-amount">
                {formatCurrency(c.tx.amount, c.tx.currencyCode)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {c.disputeReason ?? 'Fraudulent transaction reported'}
            {c.tx?.merchantName ? ` · ${c.tx.merchantName}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-xs">
            <Clock className={`w-3.5 h-3.5 ${slaExpired ? 'text-red-400' : 'text-gray-500'}`} />
            <span className={slaExpired ? 'text-red-400 font-medium' : 'text-gray-500'}>
              {slaExpired ? 'SLA expired' : `${daysLeft}d left`}
            </span>
          </div>
          <span className="text-xs text-gray-600">{formatDate(c.openedAt)}</span>
          {expanded
            ? <ChevronDown className="w-4 h-4 text-gray-500" />
            : <ChevronRight className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-dark-700/60 px-5 py-5 space-y-5">

          {c.tx && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> Transaction Detail
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <DetailField label="Amount"     value={formatCurrency(c.tx.amount, c.tx.currencyCode)} mono />
                <DetailField label="Direction"  value={c.tx.direction === 'debit' ? 'Money Out' : 'Money In'} />
                <DetailField label="Status"     value={c.tx.status} />
                {c.tx.description     && <DetailField label="Description" value={c.tx.description} />}
                {c.tx.referenceNumber && <DetailField label="Reference"   value={c.tx.referenceNumber} mono />}
                <DetailField label="Date" value={formatDate(c.tx.initiatedAt, 'dd MMM yyyy HH:mm')} />
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Case Information
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <DetailField label="Case Number"  value={c.caseNumber ?? '—'} mono />
              <DetailField label="Status"       value={c.status} />
              <DetailField label="Opened"       value={formatDate(c.openedAt, 'dd MMM yyyy')} />
              <DetailField label="SLA Deadline" value={formatDate(c.slaDeadline, 'dd MMM yyyy')} />
              {c.disputeReason && <DetailField label="Reason" value={c.disputeReason} />}
            </div>
            {c.disputeDescription && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-gray-300 bg-dark-800/60 rounded-lg px-3 py-2.5 leading-relaxed">
                  {c.disputeDescription}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
            <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Our fraud team is reviewing this case. You'll be notified once an analyst is assigned or additional information is required. Cases are typically resolved within the SLA window.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm text-white truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

export const DisputePortal: React.FC = () => {
  const { user } = useAuth()
  const [cases, setCases]       = useState<CaseWithTx[]>([])
  const [loading, setLoading]   = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const load = async () => {
      try {
        const [casesRes, txRes] = await Promise.all([
          api.get('/fraud/cases'),
          api.get('/transactions'),
        ])

        const fraudCases = casesRes.data as FraudCase[]
        const txMap: Record<string, Transaction> = Object.fromEntries(
          (txRes.data as Transaction[]).map(t => [t.id, t])
        )

        setCases(fraudCases.map(c => ({ ...c, tx: txMap[c.transactionId] })))
      } catch (err) {
        console.error('Failed to load disputes:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user])

  return (
    <AppShell>
      <div className="p-6 space-y-6 animate-fade-in">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {cases.length} case{cases.length !== 1 ? 's' : ''} on file
            </p>
          </div>
          {cases.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-amber-400">
                {cases.filter(c => c.status === 'open').length} Open
              </span>
            </div>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-dark-850 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && cases.length === 0 && (
          <div className="card p-12 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">No disputes</p>
              <p className="text-sm text-gray-500 mt-1">
                You have no open fraud cases. Transactions you report as fraud will appear here.
              </p>
            </div>
          </div>
        )}

        {!loading && cases.length > 0 && (
          <div className="space-y-3">
            {cases.map(c => (
              <CaseCard
                key={c.id}
                c={c}
                expanded={expandedId === c.id}
                onToggle={() => setExpandedId(prev => prev === c.id ? null : c.id)}
              />
            ))}
          </div>
        )}

        {!loading && cases.length > 0 && (
          <div className="card p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">How disputes work</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  When you report a transaction as fraudulent, a case is automatically opened and routed to our fraud investigation team. All cases start with "Open" status. You'll receive alerts as the case progresses. Keep your contact details up to date so we can reach you.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
