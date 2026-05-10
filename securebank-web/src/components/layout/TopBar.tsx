import { useState, useRef, useEffect } from 'react'
import {
  Bell, Search, ChevronDown, X, Mail, LogOut, Pencil,
  ArrowUpRight, ArrowDownLeft, Loader2,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAlerts } from '../../hooks/useAlerts'
import { useAvatarUrl } from '../../hooks/useAvatarUrl'
import { UserAvatar } from '../shared/UserAvatar'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/utils'
import { EditProfileModal } from '../shared/EditProfileModal'
import type { Transaction } from '../../types'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':            { title: 'Dashboard',     subtitle: 'Your financial overview' },
  '/transactions':         { title: 'Transactions',  subtitle: 'Full transaction history' },
  '/analytics':            { title: 'Analytics',     subtitle: 'Financial insights & statistics' },
  '/accounts':             { title: 'Accounts',      subtitle: 'All your bank accounts' },
  '/cards':                { title: 'Cards',         subtitle: 'Virtual card management & controls' },
  '/beneficiaries':        { title: 'Beneficiaries', subtitle: 'Saved payment recipients' },
  '/alerts':               { title: 'Alerts',        subtitle: 'Security & activity notifications' },
  '/dispute-portal':       { title: 'Disputes',      subtitle: 'Manage your fraud cases' },
  '/login-history':        { title: 'Login History', subtitle: 'Your account access log' },
  '/settings/fraud-rules': { title: 'Fraud Rules',   subtitle: 'Customize detection thresholds' },
  '/review-zone':          { title: 'Review Zone',   subtitle: 'Transactions awaiting your approval' },
}

// ─── Search modal ──────────────────────────────────────────────────────────────
function SearchModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!user || query.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { data: accts } = await supabase
          .from('accounts')
          .select('id')
          .eq('user_id', user.id)

        const ids = (accts ?? []).map((a: Record<string, unknown>) => a.id as string)
        if (ids.length === 0) { setResults([]); return }

        const q = query.trim()
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .in('account_id', ids)
          .or(`merchant_name.ilike.%${q}%,description.ilike.%${q}%,reference_number.ilike.%${q}%`)
          .order('initiated_at', { ascending: false })
          .limit(8)

        setResults((data ?? []).map((r: Record<string, unknown>) => ({
          id:               r.id as string,
          accountId:        r.account_id as string,
          userId:           r.user_id as string,
          cardId:           r.card_id as string | undefined,
          beneficiaryId:    r.beneficiary_id as string | undefined,
          amount:           Number(r.amount),
          direction:        r.direction as string,
          currencyCode:     r.currency_code as string,
          runningBalance:   r.running_balance != null ? Number(r.running_balance) : undefined,
          merchantName:     r.merchant_name as string | undefined,
          merchantCategory: r.merchant_category as string | undefined,
          merchantMcc:      r.merchant_mcc as string | undefined,
          merchantLogoUrl:  r.merchant_logo_url as string | undefined,
          locationCity:     r.location_city as string | undefined,
          locationCountry:  r.location_country as string | undefined,
          latitude:         r.latitude != null ? Number(r.latitude) : undefined,
          longitude:        r.longitude != null ? Number(r.longitude) : undefined,
          isInternational:  Boolean(r.is_international),
          status:           r.status as string,
          referenceNumber:  r.reference_number as string | undefined,
          description:      r.description as string | undefined,
          notes:            r.notes as string | undefined,
          initiatedAt:      r.initiated_at as string,
          postedAt:         r.posted_at as string | undefined,
          createdAt:        r.created_at as string,
          updatedAt:        r.updated_at as string,
        })))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, user])

  const goToTransactions = () => {
    onClose()
    navigate('/transactions')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-dark-850 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-dark-700/60">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search transactions by merchant, description, reference…"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-gray-500 animate-spin flex-shrink-0" />}
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto divide-y divide-dark-700/40">
            {results.map(tx => (
              <button
                key={tx.id}
                onClick={goToTransactions}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-dark-800/60 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  tx.direction === 'credit'
                    ? 'bg-emerald-500/15 border border-emerald-500/20'
                    : 'bg-red-500/15 border border-red-500/20'
                }`}>
                  {tx.direction === 'credit'
                    ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    : <ArrowUpRight  className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {tx.merchantName ?? tx.description ?? 'Transaction'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {formatDate(tx.initiatedAt, 'dd MMM yyyy')}
                    {tx.referenceNumber ? ` · ${tx.referenceNumber}` : ''}
                  </p>
                </div>
                <span className={`text-sm font-semibold text-amount flex-shrink-0 ${
                  tx.direction === 'credit' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {tx.direction === 'credit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currencyCode)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query.trim().length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">No transactions found for "<span className="text-gray-300">{query}</span>"</p>
          </div>
        )}

        {/* Hint */}
        {query.trim().length < 2 && (
          <div className="px-4 py-4">
            <p className="text-xs text-gray-600">Type at least 2 characters to search your transactions</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
export const TopBar: React.FC = () => {
  const { user, logout } = useAuth()
  const { unreadCount }  = useAlerts(user?.id)
  const avatarUrl        = useAvatarUrl(user?.id)
  const location         = useLocation()
  const navigate         = useNavigate()
  const [showDropdown,  setShowDropdown]  = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSearch,    setShowSearch]    = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const page = pageTitles[location.pathname] ?? { title: 'SecureBank', subtitle: '' }

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') setShowSearch(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = () => {
    setShowDropdown(false)
    navigate('/login')
    logout().catch(() => {})
  }

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-dark-700/60 bg-dark-925/80 backdrop-blur-sm flex-shrink-0">
        {/* Page title */}
        <div>
          <h1 className="text-lg font-bold text-white leading-none">{page.title}</h1>
          {page.subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{page.subtitle}</p>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Search button */}
          <button
            onClick={() => setShowSearch(true)}
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-gray-500 hover:text-gray-300 hover:border-dark-600 transition-all text-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs">Search…</span>
            <kbd className="ml-4 text-[10px] px-1.5 py-0.5 rounded bg-dark-700 text-gray-600 font-mono">⌘K</kbd>
          </button>

          {/* Notifications — links to /alerts */}
          <button
            onClick={() => navigate('/alerts')}
            className="relative w-9 h-9 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-dark-600 transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-dark-700" />

          {/* Profile button + dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(v => !v)}
              className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-lg hover:bg-dark-800 transition-all group"
            >
              <UserAvatar name={user?.fullName ?? '?'} avatarUrl={avatarUrl} size="xs" />
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-white leading-none">{user?.fullName?.split(' ')[0] ?? ''}</p>
                <p className="text-[10px] text-gray-500 leading-none mt-0.5">{greeting}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 hidden md:block transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-dark-850 border border-dark-700 rounded-2xl shadow-2xl z-40 overflow-hidden">
                <div className="px-4 py-4 border-b border-dark-700/60">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user?.fullName ?? '?'} avatarUrl={avatarUrl} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user?.fullName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-400">Verified Account</span>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => { setShowDropdown(false); setShowEditModal(true) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-dark-800 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Pencil className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Edit Profile</p>
                      <p className="text-[10px] text-gray-500">Update personal details</p>
                    </div>
                  </button>

                  <div className="my-1 border-t border-dark-700/40" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <LogOut className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-400">Sign Out</p>
                      <p className="text-[10px] text-gray-500">End your session</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      {user && (
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          userId={user.id}
        />
      )}
    </>
  )
}
