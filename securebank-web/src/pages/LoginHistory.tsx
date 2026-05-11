import { useState, useEffect } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { CheckCircle, XCircle, Clock, Shield } from 'lucide-react'

interface LoginRecord {
  id: string
  userId: string
  success: boolean
  failureReason?: string
  createdAt: string
}

function mapRecord(r: Record<string, unknown>): LoginRecord {
  return {
    id:            r.id as string,
    userId:        r.user_id as string,
    success:       Boolean(r.success),
    failureReason: r.failure_reason as string | undefined,
    createdAt:     r.attempted_at as string,
  }
}

export const LoginHistory: React.FC = () => {
  const { user } = useAuth()
  const [records, setRecords] = useState<LoginRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('login_history')
          .select('*')
          .eq('user_id', user.id)
          .order('attempted_at', { ascending: false })
          .limit(100)
        if (error) console.error('Failed to load login history:', error)
        setRecords((data ?? []).map(r => mapRecord(r as Record<string, unknown>)))
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  return (
    <AppShell>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Summary */}
        {!loading && records.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Logins',    value: records.length,                        icon: Clock,        color: 'bg-blue-500/15 text-blue-400' },
              { label: 'Successful',      value: records.filter(r => r.success).length, icon: CheckCircle,  color: 'bg-emerald-500/15 text-emerald-400' },
              { label: 'Failed Attempts', value: records.filter(r => !r.success).length,icon: XCircle,      color: 'bg-red-500/15 text-red-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card px-5 py-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white text-amount">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-700/60 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Login Activity</h3>
            <span className="ml-auto text-xs text-gray-500">{records.length} record{records.length !== 1 ? 's' : ''}</span>
          </div>

          {loading && (
            <div className="space-y-0">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-dark-700/40">
                  <div className="w-8 h-8 rounded-full bg-dark-800 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-dark-800 rounded animate-pulse" />
                    <div className="h-2.5 w-48 bg-dark-800 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-16 bg-dark-800 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {!loading && records.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Clock className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">No login history</p>
                <p className="text-xs text-gray-500 mt-1">Your login activity will appear here</p>
              </div>
            </div>
          )}

          {!loading && records.length > 0 && (
            <div className="divide-y divide-dark-700/40">
              {records.map(record => (
                <div key={record.id} className="flex items-center gap-4 px-5 py-4 hover:bg-dark-800/30 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    record.success ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-red-500/15 border border-red-500/20'
                  }`}>
                    {record.success
                      ? <CheckCircle className="w-4.5 h-4.5 text-emerald-400" style={{ width: 18, height: 18 }} />
                      : <XCircle    className="w-4.5 h-4.5 text-red-400"     style={{ width: 18, height: 18 }} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {record.success ? 'Successful login' : 'Failed login attempt'}
                    </p>
                    {record.failureReason
                      ? <p className="text-xs text-red-400 mt-0.5 truncate">{record.failureReason}</p>
                      : <p className="text-xs text-gray-600 mt-0.5">Session started</p>
                    }
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-400">{formatDate(record.createdAt, 'dd MMM yyyy')}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{formatDate(record.createdAt, 'HH:mm')}</p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex-shrink-0 ${
                    record.success ? 'status-posted' : 'status-blocked'
                  }`}>
                    {record.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
          <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed">
            If you see login attempts you don't recognise, change your password immediately and contact support. All login times are recorded in your local timezone.
          </p>
        </div>

      </div>
    </AppShell>
  )
}
