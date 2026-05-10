import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBeneficiaries } from '../hooks/useBeneficiaries'
import { AppShell } from '../components/layout/AppShell'
import { AddBeneficiaryModal } from '../components/dashboard/AddBeneficiaryModal'
import { Users2, Plus, Trash2, Check, Search, Ban } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500',
]

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export const Beneficiaries: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { beneficiaries, loading, addBeneficiary, deleteBeneficiary, blockBeneficiary } = useBeneficiaries(user?.id)

  const [showAdd, setShowAdd]               = useState(false)
  const [search, setSearch]                 = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]             = useState(false)

  if (!authLoading && !user) { navigate('/login'); return null }

  const filtered = beneficiaries.filter(b =>
    search === '' ||
    b.fullName.toLowerCase().includes(search.toLowerCase()) ||
    b.accountNumber.includes(search) ||
    b.bankName.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await deleteBeneficiary(id)
      toast.success('Beneficiary removed')
      setConfirmDeleteId(null)
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to remove beneficiary')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Beneficiaries</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage your saved payment recipients</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Beneficiary
          </button>
        </div>

        {/* Search */}
        {beneficiaries.length > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, bank or account…"
              className="input-dark pl-9"
            />
          </div>
        )}

        {/* Loading skeleton */}
        {(authLoading || loading) && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-dark-850 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !authLoading && beneficiaries.length === 0 && (
          <div className="card p-12 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <Users2 className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">No beneficiaries yet</p>
              <p className="text-sm text-gray-500 mt-1">Add a recipient to quickly send money without re-entering details</p>
            </div>
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 mt-2">
              <Plus className="w-4 h-4" /> Add Your First Beneficiary
            </button>
          </div>
        )}

        {/* No search results */}
        {!loading && filtered.length === 0 && beneficiaries.length > 0 && (
          <p className="text-sm text-gray-500">No beneficiaries match "{search}"</p>
        )}

        {/* Beneficiary cards */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(b => (
              <div
                key={b.id}
                className="card p-5 flex flex-col gap-4 hover:border-dark-600 transition-colors"
              >
                {/* Top row: avatar + name + verified */}
                <div className="flex items-center gap-3">
                  <div className={clsx('w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0', avatarColor(b.fullName))}>
                    {initials(b.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{b.fullName}</p>
                      {b.isVerified && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-semibold text-emerald-400">
                          <Check className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                      {b.isBlocked && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-[10px] font-semibold text-amber-400">
                          <Ban className="w-2.5 h-2.5" /> Blocked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{b.bankName}</p>
                  </div>
                </div>

                {/* Account details */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Account</span>
                    <span className="text-gray-300 font-mono">{b.accountNumber}</span>
                  </div>
                  {b.branchCode && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Branch</span>
                      <span className="text-gray-300 font-mono">{b.branchCode}</span>
                    </div>
                  )}
                  {b.reference && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Reference</span>
                      <span className="text-gray-300 truncate ml-4 text-right">{b.reference}</span>
                    </div>
                  )}
                </div>

                {/* Delete / block actions */}
                <div className="border-t border-dark-700 pt-3 flex items-center justify-between">
                  {confirmDeleteId === b.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Remove this beneficiary?</span>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        disabled={deleting}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors font-semibold px-2 py-1"
                      >
                        {deleting ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(b.id)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                  <button
                    onClick={() => blockBeneficiary(b.id, !b.isBlocked).catch(err => toast.error(err instanceof Error ? err.message : 'Failed'))}
                    className={clsx('p-2 rounded-lg transition-all', b.isBlocked ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' : 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/10')}
                    title={b.isBlocked ? 'Unblock beneficiary' : 'Block beneficiary'}
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {user && (
        <AddBeneficiaryModal
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          onAdd={addBeneficiary}
          onAdded={() => setShowAdd(false)}
        />
      )}
    </AppShell>
  )
}
