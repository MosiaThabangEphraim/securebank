import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { useAuth } from '../hooks/useAuth'
import { useAlerts } from '../hooks/useAlerts'
import { formatDate, formatRelativeTime } from '../lib/utils'
import type { Alert } from '../types'
import {
  Bell, BellOff, CheckCircle, ShieldAlert, Clock,
  AlertTriangle, Info, Shield, CheckCheck,
} from 'lucide-react'
import clsx from 'clsx'

// ─── Alert type config ────────────────────────────────────────────────────────

const TYPE_META: Record<string, {
  icon: React.ElementType
  iconClass: string
  bgClass: string
  borderClass: string
  label: string
}> = {
  transaction: {
    icon: CheckCircle,
    iconClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/20',
    label: 'Transaction',
  },
  review: {
    icon: Clock,
    iconClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/20',
    label: 'Review',
  },
  fraud: {
    icon: ShieldAlert,
    iconClass: 'text-red-400',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/20',
    label: 'Fraud',
  },
  dispute: {
    icon: AlertTriangle,
    iconClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/20',
    label: 'Dispute',
  },
  security: {
    icon: Shield,
    iconClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    label: 'Security',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    label: 'Info',
  },
}

const typeMeta = (type: string) => TYPE_META[type] ?? TYPE_META.info

// ─── Group alerts by date ─────────────────────────────────────────────────────

function groupByDate(alerts: Alert[]): { label: string; items: Alert[] }[] {
  const groups: Record<string, Alert[]> = {}
  const today = formatDate(new Date(), 'dd MMM yyyy')
  const yesterday = formatDate(new Date(Date.now() - 86400000), 'dd MMM yyyy')

  for (const a of alerts) {
    const key = formatDate(a.createdAt, 'dd MMM yyyy')
    const label = key === today ? 'Today' : key === yesterday ? 'Yesterday' : key
    if (!groups[label]) groups[label] = []
    groups[label].push(a)
  }

  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

// ─── AlertRow ─────────────────────────────────────────────────────────────────

function AlertRow({
  alert,
  onMarkRead,
}: {
  alert: Alert
  onMarkRead: (id: string) => void
}) {
  const navigate = useNavigate()
  const meta = typeMeta(alert.alertType)
  const Icon = meta.icon
  const isUnread = alert.status === 'unread'

  const handleClick = () => {
    if (isUnread) onMarkRead(alert.id)
    if (alert.actionUrl) navigate(alert.actionUrl)
  }

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'relative flex items-start gap-4 p-4 rounded-xl border transition-all',
        (isUnread || alert.actionUrl) ? 'cursor-pointer hover:bg-dark-800/60' : 'cursor-default',
        isUnread
          ? 'bg-dark-800/80 border-dark-600'
          : 'bg-dark-850/40 border-dark-700/60'
      )}
    >
      {/* Unread dot */}
      {isUnread && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
      )}

      {/* Icon */}
      <div className={clsx(
        'w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0',
        meta.bgClass, meta.borderClass
      )}>
        <Icon className={clsx('w-5 h-5', meta.iconClass)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={clsx(
            'text-sm font-semibold',
            isUnread ? 'text-white' : 'text-gray-300'
          )}>
            {alert.title}
          </span>
          <span className={clsx(
            'text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide',
            meta.bgClass, meta.borderClass, meta.iconClass
          )}>
            {meta.label}
          </span>
          {alert.actionRequired && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide bg-amber-500/10 border-amber-500/20 text-amber-400">
              Action required
            </span>
          )}
        </div>

        <p className={clsx('text-xs leading-relaxed', isUnread ? 'text-gray-300' : 'text-gray-500')}>
          {alert.message}
        </p>

        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] text-gray-600">{formatRelativeTime(alert.createdAt)}</span>
          {!isUnread && alert.readAt && (
            <span className="text-[10px] text-gray-700">Read {formatDate(alert.readAt, 'dd MMM · HH:mm')}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const AlertsPage: React.FC = () => {
  const { user } = useAuth()
  const { alerts, unreadCount, loading, markAsRead, markAllAsRead } = useAlerts(user?.id)

  const groups = groupByDate(alerts)

  return (
    <AppShell>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Alerts</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Loading…' : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-600 text-gray-300 hover:text-white text-sm font-semibold transition-all"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {/* Skeletons */}
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-dark-850 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && alerts.length === 0 && (
          <div className="card p-14 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <BellOff className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">No alerts yet</p>
              <p className="text-sm text-gray-500 mt-1">
                You'll be notified here when transactions are made, reviewed, or flagged.
              </p>
            </div>
          </div>
        )}

        {/* Grouped alert list */}
        {!loading && alerts.length > 0 && (
          <div className="space-y-6">
            {groups.map(({ label, items }) => (
              <div key={label} className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">{label}</p>
                {items.map(alert => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onMarkRead={markAsRead}
                  />
                ))}
              </div>
            ))}

            {/* Footer summary */}
            {alerts.length > 0 && (
              <div className="flex items-center justify-center gap-2 pt-2 text-xs text-gray-600">
                <Bell className="w-3.5 h-3.5" />
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''} total
              </div>
            )}
          </div>
        )}

      </div>
    </AppShell>
  )
}
