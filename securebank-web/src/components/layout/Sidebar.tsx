import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CreditCard,
  ArrowLeftRight,
  Users2,
  Bell,
  ShieldAlert,
  LogOut,
  ShieldCheck,
  Settings,
  ChevronRight,
  TrendingUp,
  History,
  Pencil,
  Mail,
  Landmark,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAlerts } from '../../hooks/useAlerts'
import { useAvatarUrl } from '../../hooks/useAvatarUrl'
import { EditProfileModal } from '../shared/EditProfileModal'
import { UserAvatar } from '../shared/UserAvatar'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const navSections = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
      { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
      { label: 'Analytics',    href: '/analytics',    icon: TrendingUp },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { label: 'Accounts',      href: '/accounts',       icon: Landmark },
      { label: 'Cards',         href: '/cards',          icon: CreditCard },
      { label: 'Beneficiaries', href: '/beneficiaries',  icon: Users2 },
    ],
  },
  {
    label: 'Security',
    items: [
      { label: 'Alerts',        href: '/alerts',                icon: Bell,       badge: true },
      { label: 'Disputes',      href: '/dispute-portal',        icon: ShieldAlert },
      { label: 'Review Zone',   href: '/review-zone',           icon: ShieldCheck },
      { label: 'Login History', href: '/login-history',         icon: History },
      { label: 'Fraud Rules',   href: '/settings/fraud-rules',  icon: Settings },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Account Settings', href: '/settings', icon: Settings },
    ],
  },
]

export const Sidebar: React.FC = () => {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user, logout } = useAuth()
  const { unreadCount }  = useAlerts(user?.id)
  const avatarUrl        = useAvatarUrl(user?.id)

  const [showDropdown,  setShowDropdown]  = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const stripRef    = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })

  const handleLogout = () => {
    navigate('/login')
    logout().catch(() => {})
  }

  const handleStripClick = () => {
    if (stripRef.current) {
      const rect = stripRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 8, left: rect.left })
    }
    setShowDropdown(v => !v)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        stripRef.current    && !stripRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/')

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    <>
      <aside className="w-64 h-full flex flex-col flex-shrink-0 border-r border-dark-700"
        style={{ background: 'linear-gradient(180deg, #070B14 0%, #0A0F1E 100%)' }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-dark-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-glow-blue flex-shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-white" style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight">SecureBank</p>
              <p className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Online Banking</p>
            </div>
          </div>
        </div>

        {/* Clickable user profile strip */}
        <div
          ref={stripRef}
          onClick={handleStripClick}
          className="px-4 py-3 mx-3 mt-3 rounded-xl bg-dark-800/60 border border-dark-700/40 flex items-center gap-3 cursor-pointer hover:bg-dark-800 hover:border-dark-600 transition-all group"
        >
          <UserAvatar name={user?.fullName ?? '?'} avatarUrl={avatarUrl} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.fullName ?? 'Loading...'}</p>
            <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Verified account
            </p>
          </div>
          <ChevronRight className={`w-3.5 h-3.5 text-gray-600 flex-shrink-0 transition-transform ${showDropdown ? 'rotate-90' : ''}`} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ label, href, icon: Icon, badge }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      to={href}
                      className={clsx('nav-item', active && 'nav-item-active')}
                    >
                      <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-blue-400' : 'text-gray-500')} />
                      <span className="flex-1 text-sm">{label}</span>
                      {badge && unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white min-w-[18px] text-center leading-none">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                      {active && <div className="w-1 h-1 rounded-full bg-blue-400" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-dark-700/60 space-y-1">
          <button
            onClick={handleLogout}
            className="nav-item w-full text-left"
          >
            <LogOut className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Profile dropdown (portal) */}
      {showDropdown && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 w-64 bg-dark-850 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
          style={{ top: dropPos.top, left: dropPos.left }}
        >
          {/* User info */}
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

          {/* Actions */}
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
              onClick={() => { setShowDropdown(false); handleLogout() }}
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
        </div>,
        document.body
      )}

      {/* Edit profile modal */}
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
