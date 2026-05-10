import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppShell } from '../components/layout/AppShell'
import { AddCardModal } from '../components/cards/AddCardModal'
import { api } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import type { Account, Card } from '../types'
import {
  CreditCard, Plus, Globe, Monitor, Wifi, ShieldCheck,
  Snowflake, Flame, ChevronRight, RotateCcw, Settings2, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ─── Visual payment card ──────────────────────────────────────────────────────
function formatCardNumber(n: string, hidden: boolean) {
  if (hidden) return '•••• •••• •••• ••••'
  const clean = n.replace(/\D/g, '').padEnd(16, '0')
  return `${clean.slice(0,4)} ${clean.slice(4,8)} ${clean.slice(8,12)} ${clean.slice(12,16)}`
}

function PaymentCard({
  card,
  selected,
  onClick,
}: {
  card: Card
  selected: boolean
  onClick: () => void
}) {
  const [flipped, setFlipped] = useState(false)
  const [hidden,  setHidden]  = useState(true)
  const frozen = card.status === 'frozen'

  const gradient = card.cardType === 'mastercard'
    ? 'linear-gradient(135deg, #7c3aed 0%, #991b1b 100%)'
    : 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)'

  const expiryStr = `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`

  const signatureStripStyle: React.CSSProperties = {
    background: 'repeating-linear-gradient(45deg,#e5e7eb 0,#e5e7eb 2px,#f9fafb 2px,#f9fafb 8px)',
  }

  return (
    <div
      onClick={onClick}
      className={clsx(
        'cursor-pointer transition-all duration-200',
        selected ? 'scale-[1.02]' : 'hover:scale-[1.01]',
        frozen && 'opacity-70'
      )}
      style={{ perspective: '1000px', minHeight: '196px' }}
    >
      {/* Flip ring only on selected */}
      {selected && <div className="absolute inset-0 rounded-2xl ring-2 ring-blue-500 ring-offset-2 ring-offset-dark-950 pointer-events-none z-30" />}

      <div
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.55s cubic-bezier(0.4,0.2,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
          minHeight: '196px',
        }}
      >
        {/* ── FRONT ── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ background: gradient, backfaceVisibility: 'hidden', pointerEvents: flipped ? 'none' : 'auto' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

          {frozen && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-600/50">
                <Snowflake className="w-4 h-4 text-blue-300" />
                <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Frozen</span>
              </div>
            </div>
          )}

          <div className="relative z-10 p-5 flex flex-col" style={{ minHeight: '196px' }}>
            {/* Top row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                {card.cardType === 'visa' ? (
                  <span className="text-white text-lg font-bold italic tracking-tight">VISA</span>
                ) : (
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-red-500/90" />
                    <div className="w-6 h-6 rounded-full bg-amber-400/90 -ml-3" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); setHidden(v => !v) }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white/70 hover:text-white"
                  title={hidden ? 'Reveal' : 'Hide'}
                >
                  <Wifi className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setFlipped(true) }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white/70 hover:text-white"
                  title="See back"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                {/* Chip */}
                <div className="w-8 h-6 rounded bg-gradient-to-br from-yellow-300/80 to-yellow-500/60 border border-yellow-200/40 flex items-center justify-center">
                  <div className="w-5 h-3.5 rounded-sm border border-yellow-200/60 bg-yellow-400/30" />
                </div>
              </div>
            </div>

            {/* Card number */}
            <p className="text-white/80 text-sm font-mono tracking-widest mb-4">
              {formatCardNumber(card.cardNumber, hidden)}
            </p>

            {/* Bottom */}
            <div className="flex items-end justify-between mt-auto">
              <div>
                <p className="text-white/40 text-[9px] uppercase tracking-wider mb-0.5">Card Holder</p>
                <p className="text-white/90 text-xs font-semibold tracking-wide truncate max-w-[140px]">
                  {card.cardHolderName}
                </p>
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[9px] font-semibold text-white/60 uppercase tracking-wider">
                Virtual
              </span>
            </div>
          </div>
        </div>

        {/* ── BACK ── */}
        <div
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            background: gradient,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            pointerEvents: flipped ? 'auto' : 'none',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between" style={{ minHeight: '196px' }}>
            {/* Magnetic stripe */}
            <div className="w-full h-10 bg-black/70 mt-5" />

            <div className="px-5 pt-4 flex flex-col gap-3 flex-1">
              {/* Signature strip + CVV */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-8 rounded bg-white/90 flex items-center px-2">
                  <div className="flex-1 h-3 rounded-sm" style={signatureStripStyle} />
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-white/50 text-[8px] uppercase tracking-wider mb-0.5">CVV</p>
                  <div className="px-3 py-1.5 rounded bg-white/95 min-w-[40px] text-center">
                    <p className="text-dark-900 text-sm font-bold font-mono tracking-widest">
                      {hidden ? '•••' : (card.cvv ?? '•••')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expiry + flip button row */}
              <div className="flex items-center justify-between pb-3">
                <div>
                  <p className="text-white/40 text-[9px] uppercase tracking-wider mb-0.5">Valid Thru</p>
                  <p className="text-white/90 text-sm font-mono">{expiryStr}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setFlipped(false) }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/30 transition-all text-white/80 hover:text-white text-[10px] font-semibold"
                >
                  <RotateCcw className="w-3 h-3" /> Flip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Toggle row ───────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  description,
  icon: Icon,
  value,
  onChange,
  loading,
}: {
  label: string
  description?: string
  icon: React.ElementType
  value: boolean
  onChange: (v: boolean) => void
  loading?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={clsx(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          value ? 'bg-blue-500/15 text-blue-400' : 'bg-dark-700 text-gray-500'
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      </div>
      <button
        onClick={() => !loading && onChange(!value)}
        className={clsx(
          'relative w-10 h-6 rounded-full transition-all duration-200 flex-shrink-0',
          value ? 'bg-blue-500' : 'bg-dark-600',
          loading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={clsx(
          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
          value ? 'translate-x-4' : 'translate-x-0'
        )} />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export const Cards: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [cards, setCards] = useState<Card[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [showAddCard, setShowAddCard] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }

    const load = async () => {
      try {
        const [cardsRes, accRes] = await Promise.all([
          api.get('/cards'),
          api.get('/accounts'),
        ])
        const loadedCards = cardsRes.data as Card[]
        const loadedAccounts = accRes.data as Account[]
        setCards(loadedCards)
        setAccounts(loadedAccounts)
        if (loadedCards.length > 0) setSelectedCardId(loadedCards[0].id)
      } catch (err) {
        console.error('Failed to load cards:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, authLoading, navigate])

  const selectedCard = useMemo(() => {
    setShowDeleteConfirm(false)
    return cards.find(c => c.id === selectedCardId) ?? null
  }, [cards, selectedCardId])

  const linkedAccount = useMemo(
    () => selectedCard ? accounts.find(a => a.id === selectedCard.accountId) : null,
    [selectedCard, accounts]
  )

  const updateCard = async (id: string, patch: Partial<Card>) => {
    setToggling(true)
    try {
      let updatedCard: Card
      if ('status' in patch) {
        const endpoint = patch.status === 'frozen' ? `/cards/${id}/freeze` : `/cards/${id}/unfreeze`
        const { data } = await api.patch(endpoint)
        updatedCard = data as Card
      } else {
        const controls: Record<string, unknown> = {}
        if ('allowInternational' in patch) controls.allowInternational = patch.allowInternational
        if ('allowOnline' in patch)        controls.allowOnline = patch.allowOnline
        if ('allowContactless' in patch)   controls.allowContactless = patch.allowContactless
        if ('dailyLimit' in patch)         controls.dailyLimit = patch.dailyLimit
        const { data } = await api.patch(`/cards/${id}/controls`, controls)
        updatedCard = data as Card
      }
      setCards(prev => prev.map(c => c.id === id ? updatedCard : c))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update card')
    } finally {
      setToggling(false)
    }
  }

  const toggleFreeze = () => {
    if (!selectedCard) return
    const newStatus = selectedCard.status === 'frozen' ? 'active' : 'frozen'
    updateCard(selectedCard.id, { status: newStatus })
    toast.success(newStatus === 'frozen' ? 'Card frozen' : 'Card unfrozen')
  }

  const handleDeleteCard = async () => {
    if (!selectedCard) return
    setDeleting(true)
    try {
      await api.delete(`/cards/${selectedCard.id}`)
      const remaining = cards.filter(c => c.id !== selectedCard.id)
      setCards(remaining)
      setSelectedCardId(remaining[0]?.id ?? null)
      setShowDeleteConfirm(false)
      toast.success('Card deleted')
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? 'Failed to delete card')
    } finally {
      setDeleting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="p-6 space-y-6">
          <div className="h-8 w-36 bg-dark-800 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-44 rounded-2xl bg-dark-850 animate-pulse" />)}
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">My Cards</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage and control your payment cards</p>
          </div>
          <button
            onClick={() => setShowAddCard(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" /> Issue Virtual Card
          </button>
        </div>

        {cards.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-dark-700 bg-dark-850 p-16 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-4">
              <CreditCard className="w-9 h-9 text-gray-600" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">No cards yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-6">
              Issue a virtual Visa or Mastercard linked to any of your accounts. It only takes seconds.
            </p>
            <button
              onClick={() => setShowAddCard(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Issue Your First Virtual Card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: card gallery */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {cards.length} card{cards.length !== 1 ? 's' : ''}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cards.map(card => (
                  <PaymentCard
                    key={card.id}
                    card={card}
                    selected={selectedCardId === card.id}
                    onClick={() => setSelectedCardId(card.id)}
                  />
                ))}
                {/* Add card tile */}
                <button
                  onClick={() => setShowAddCard(true)}
                  className="min-h-[180px] rounded-2xl border-2 border-dashed border-dark-700 hover:border-blue-500/40 hover:bg-blue-500/5 flex flex-col items-center justify-center gap-3 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-dark-800 group-hover:bg-blue-500/20 border border-dark-700 group-hover:border-blue-500/40 flex items-center justify-center transition-all">
                    <Plus className="w-6 h-6 text-gray-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-500 group-hover:text-gray-300 transition-colors">Issue Virtual Card</p>
                    <p className="text-xs text-gray-600">Visa or Mastercard</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Right: card controls */}
            {selectedCard && (
              <div className="space-y-4">

                {/* Linked account */}
                {linkedAccount && (
                  <div className="card p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Linked Account</p>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{linkedAccount.accountName}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(linkedAccount.availableBalance)} available
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600 ml-auto" />
                    </div>
                  </div>
                )}

                {/* Freeze toggle */}
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'w-9 h-9 rounded-xl flex items-center justify-center',
                        selectedCard.status === 'frozen' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
                      )}>
                        {selectedCard.status === 'frozen'
                          ? <Snowflake className="w-4 h-4" />
                          : <Flame className="w-4 h-4" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {selectedCard.status === 'frozen' ? 'Card Frozen' : 'Card Active'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedCard.status === 'frozen'
                            ? 'All transactions are blocked'
                            : 'Tap to temporarily freeze'
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleFreeze}
                      disabled={toggling}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                        selectedCard.status === 'frozen'
                          ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25',
                        toggling && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {selectedCard.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                    </button>
                  </div>
                </div>

                {/* Card controls */}
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings2 className="w-4 h-4 text-gray-500" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Card Controls</p>
                  </div>
                  <div className="divide-y divide-dark-700">
                    <ToggleRow
                      label="International Payments"
                      description="Allow transactions outside SA"
                      icon={Globe}
                      value={selectedCard.allowInternational}
                      onChange={v => updateCard(selectedCard.id, { allowInternational: v })}
                      loading={toggling}
                    />
                    <ToggleRow
                      label="Online Payments"
                      description="E-commerce and card-not-present"
                      icon={Monitor}
                      value={selectedCard.allowOnline}
                      onChange={v => updateCard(selectedCard.id, { allowOnline: v })}
                      loading={toggling}
                    />
                    <ToggleRow
                      label="Contactless"
                      description="Tap-to-pay and NFC payments"
                      icon={Wifi}
                      value={selectedCard.allowContactless}
                      onChange={v => updateCard(selectedCard.id, { allowContactless: v })}
                      loading={toggling}
                    />
                  </div>
                </div>

                {/* Daily limit */}
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-gray-500" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Daily Spend Limit</p>
                  </div>
                  <DailyLimitEditor
                    value={selectedCard.dailyLimit}
                    onSave={v => updateCard(selectedCard.id, { dailyLimit: v })}
                    loading={toggling}
                  />
                </div>

                {/* Delete card */}
                {showDeleteConfirm ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-4 space-y-3">
                    <p className="text-sm font-semibold text-white">Delete this card?</p>
                    <p className="text-xs text-gray-400">
                      Your {selectedCard.cardType.toUpperCase()} card ending in{' '}
                      <span className="font-mono text-white">
                        {(selectedCard.cardNumberLast4 ?? selectedCard.cardNumber.slice(-4))}
                      </span>{' '}
                      will be permanently removed. This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 px-3 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 border border-dark-600 text-gray-300 text-xs font-semibold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteCard}
                        disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        {deleting
                          ? <><span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />Deleting…</>
                          : <><Trash2 className="w-3.5 h-3.5" />Yes, Delete</>
                        }
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold transition-all"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Card
                  </button>
                )}

              </div>
            )}
          </div>
        )}
      </div>

      {user && (
        <AddCardModal
          isOpen={showAddCard}
          onClose={() => setShowAddCard(false)}
          userId={user.id}
          cardHolderName={user.fullName}
          accounts={accounts}
          onCreated={card => {
            setCards(prev => [card, ...prev])
            setSelectedCardId(card.id)
          }}
        />
      )}
    </AppShell>
  )
}

// ─── Daily limit inline editor ────────────────────────────────────────────────
function DailyLimitEditor({
  value,
  onSave,
  loading,
}: {
  value: number
  onSave: (v: number) => void
  loading: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  const handleSave = () => {
    const n = parseFloat(draft)
    if (isNaN(n) || n <= 0) { toast.error('Enter a valid limit'); return }
    onSave(n)
    setEditing(false)
  }

  return editing ? (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        className="input-dark flex-1 text-sm"
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
      />
      <button onClick={handleSave} disabled={loading} className="btn-primary text-xs px-3 py-2">Save</button>
      <button onClick={() => setEditing(false)} className="btn-secondary text-xs px-3 py-2">Cancel</button>
    </div>
  ) : (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xl font-bold text-white text-amount">{formatCurrency(value)}</p>
        <p className="text-xs text-gray-500">per day</p>
      </div>
      <button
        onClick={() => { setDraft(String(value)); setEditing(true) }}
        className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
      >
        Edit
      </button>
    </div>
  )
}
