import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { AppShell } from '../components/layout/AppShell'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import {
  ArrowUpRight, ArrowDownLeft, ShieldAlert, ArrowLeftRight,
  TrendingUp, Wallet, AlertTriangle, CheckCircle,
} from 'lucide-react'

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

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold text-gray-400 mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

const StatusColors: Record<string, string> = {
  posted:   '#10b981',
  pending:  '#3b82f6',
  blocked:  '#ef4444',
  disputed: '#a855f7',
  reversed: '#6b7280',
}

interface AnalyticsSummary {
  totalTransactions: number
  totalSent: number
  totalReceived: number
  pendingCount: number
  blockedCount: number
  postedCount: number
  fraudCaseCount: number
  monthlyFlow: { month: string; sent: number; received: number }[]
  statusBreakdown: { status: string; count: number }[]
}

export const Analytics: React.FC = () => {
  const { user } = useAuth()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    api.get('/analytics/summary')
      .then(res => setSummary(res.data))
      .catch((err) => {
        const msg = err?.response?.data?.error ?? err?.message ?? 'Failed to load analytics'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [user?.id])

  if (loading) {
    return (
      <AppShell>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-dark-850 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 rounded-2xl bg-dark-850 animate-pulse" />
            <div className="h-72 rounded-2xl bg-dark-850 animate-pulse" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !summary) {
    return (
      <AppShell>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-red-400 font-semibold mb-2">Could not load analytics</p>
          <p className="text-xs text-gray-500 mb-4">{error ?? 'Make sure the API is running on localhost:5093'}</p>
          <button
            onClick={() => { setLoading(true); setError(null); api.get('/analytics/summary').then(r => setSummary(r.data)).catch(e => setError(e?.message)).finally(() => setLoading(false)) }}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </AppShell>
    )
  }

  const net = summary.totalReceived - summary.totalSent

  return (
    <AppShell>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Primary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Transactions"
            value={summary.totalTransactions.toString()}
            sub="All accounts, all time"
            icon={ArrowLeftRight}
            color="bg-blue-500/15 text-blue-400"
          />
          <StatCard
            label="Total Sent"
            value={formatCurrency(summary.totalSent)}
            sub="Sum of all debits"
            icon={ArrowUpRight}
            color="bg-red-500/15 text-red-400"
          />
          <StatCard
            label="Total Received"
            value={formatCurrency(summary.totalReceived)}
            sub="Sum of all credits"
            icon={ArrowDownLeft}
            color="bg-emerald-500/15 text-emerald-400"
          />
          <StatCard
            label="Fraud Cases"
            value={summary.fraudCaseCount.toString()}
            sub="Reported disputes"
            icon={ShieldAlert}
            color="bg-amber-500/15 text-amber-400"
          />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Posted"         value={summary.postedCount.toString()}  sub="Completed"    icon={CheckCircle}   color="bg-emerald-500/15 text-emerald-400" />
          <StatCard label="Pending Review" value={summary.pendingCount.toString()} sub="Under review" icon={AlertTriangle} color="bg-blue-500/15 text-blue-400" />
          <StatCard label="Blocked"        value={summary.blockedCount.toString()} sub="Stopped"      icon={ShieldAlert}   color="bg-red-500/15 text-red-400" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Monthly Flow</h3>
              <span className="ml-auto text-xs text-gray-500">Last 6 months</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={summary.monthlyFlow} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Area type="monotone" dataKey="sent"     name="Sent"     stroke="#ef4444" strokeWidth={2} fill="url(#gradSent)"     dot={false} />
                <Area type="monotone" dataKey="received" name="Received" stroke="#10b981" strokeWidth={2} fill="url(#gradReceived)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-5">
              <Wallet className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Income vs Spend</h3>
              <span className="ml-auto text-xs text-gray-500">Per month</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.monthlyFlow} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Bar dataKey="received" name="Received" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="sent"     name="Sent"     fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status breakdown */}
        {summary.statusBreakdown.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Transaction Status Breakdown</h3>
            <div className="space-y-3">
              {summary.statusBreakdown.map(({ status, count }) => {
                const pct = summary.totalTransactions > 0 ? (count / summary.totalTransactions) * 100 : 0
                const color = StatusColors[status] ?? '#6b7280'
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-400 w-24 capitalize">{status}</span>
                    <div className="flex-1 h-2 bg-dark-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-white w-8 text-right">{count}</span>
                    <span className="text-xs text-gray-600 w-10 text-right">{pct.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Net flow summary */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Net Flow Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Received</p>
              <p className="text-lg font-bold text-emerald-400 text-amount">{formatCurrency(summary.totalReceived)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Sent</p>
              <p className="text-lg font-bold text-red-400 text-amount">{formatCurrency(summary.totalSent)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Net</p>
              <p className={`text-lg font-bold text-amount ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(net)}
              </p>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
