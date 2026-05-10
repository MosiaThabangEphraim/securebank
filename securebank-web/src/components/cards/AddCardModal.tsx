import { useState } from 'react'
import { Modal } from '../shared/Modal'
import { api } from '../../lib/api'
import type { Account, Card } from '../../types'
import toast from 'react-hot-toast'
import { Check, CreditCard, Landmark, PiggyBank } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  isOpen: boolean
  onClose: () => void
  userId: string
  cardHolderName: string
  accounts: Account[]
  onCreated: (card: Card) => void
}

const CARD_TYPES = [
  {
    type: 'visa',
    label: 'Visa',
    description: 'Accepted worldwide at millions of merchants',
    gradient: 'linear-gradient(135deg, #1a56db 0%, #1e3a8a 100%)',
    color: 'border-blue-500/40 bg-blue-500/10',
    activeColor: 'border-blue-500 bg-blue-500/20',
  },
  {
    type: 'mastercard',
    label: 'Mastercard',
    description: 'Global payments with enhanced security',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #7c3aed 100%)',
    color: 'border-red-500/40 bg-red-500/10',
    activeColor: 'border-red-500 bg-red-500/20',
  },
]

const accountTypeIcon: Record<string, React.ElementType> = {
  cheque: Landmark,
  savings: PiggyBank,
  credit: CreditCard,
}

export const AddCardModal: React.FC<Props> = ({
  isOpen, onClose, cardHolderName, accounts, onCreated,
}) => {
  const activeAccounts = accounts.filter(a => a.status === 'active')
  const [selectedCardType, setSelectedCardType] = useState('visa')
  const [selectedAccountId, setSelectedAccountId] = useState(activeAccounts[0]?.id ?? '')
  const [holderName, setHolderName] = useState(cardHolderName)
  const [dailyLimit, setDailyLimit] = useState('5000')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!holderName.trim()) { toast.error('Please enter the card holder name'); return }
    if (!selectedAccountId) { toast.error('Please select an account'); return }
    const limit = parseFloat(dailyLimit)
    if (isNaN(limit) || limit <= 0) { toast.error('Please enter a valid daily limit'); return }

    setLoading(true)
    try {
      const { data } = await api.post('/cards', {
        accountId:      selectedAccountId,
        cardType:       selectedCardType,
        cardHolderName: holderName.trim(),
        dailyLimit:     limit,
      })

      toast.success('Card issued successfully!')
      onCreated(data as Card)
      setHolderName(cardHolderName)
      setSelectedCardType('visa')
      setDailyLimit('5000')
      onClose()
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err as { message?: string })?.message
        ?? 'Failed to issue card'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Issue Virtual Card"
      subtitle="Link a virtual payment card to one of your accounts"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} disabled={loading || activeAccounts.length === 0} className="btn-primary flex items-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Issuing...</>
              : <><Check className="w-4 h-4" />Issue Card</>
            }
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {activeAccounts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">You need at least one active account to issue a card.</p>
          </div>
        ) : (
          <>
            {/* Card network */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Card Network</label>
              {CARD_TYPES.map(ct => {
                const active = selectedCardType === ct.type
                return (
                  <button
                    key={ct.type}
                    type="button"
                    onClick={() => setSelectedCardType(ct.type)}
                    className={clsx(
                      'w-full flex items-center gap-4 p-3 rounded-xl border-2 transition-all text-left',
                      active ? ct.activeColor : `${ct.color} hover:border-opacity-70`
                    )}
                  >
                    <div className="w-12 h-8 rounded-lg flex-shrink-0" style={{ background: ct.gradient }}>
                      <div className="w-full h-full flex items-center justify-center">
                        {ct.type === 'visa' ? (
                          <span className="text-white text-xs font-bold italic tracking-tight">VISA</span>
                        ) : (
                          <div className="flex">
                            <div className="w-4 h-4 rounded-full bg-red-500 opacity-90" />
                            <div className="w-4 h-4 rounded-full bg-amber-400 opacity-90 -ml-2" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{ct.label}</p>
                      <p className="text-xs text-gray-500">{ct.description}</p>
                    </div>
                    <div className={clsx(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      active ? 'border-blue-400 bg-blue-500' : 'border-dark-600'
                    )}>
                      {active && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Linked account */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Link to Account
              </label>
              <div className="space-y-2">
                {activeAccounts.map(acc => {
                  const Icon = accountTypeIcon[acc.accountType] ?? CreditCard
                  const active = selectedAccountId === acc.id
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedAccountId(acc.id)}
                      className={clsx(
                        'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                        active
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{acc.accountName}</p>
                        <p className="text-xs text-gray-500">···{acc.accountNumber.slice(-4)}</p>
                      </div>
                      {active && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Card holder name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Card Holder Name
              </label>
              <input
                type="text"
                value={holderName}
                onChange={e => setHolderName(e.target.value)}
                placeholder="Name as it should appear on card"
                className="input-dark uppercase"
                maxLength={26}
              />
            </div>

            {/* Daily limit */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Daily Spend Limit (ZAR)
              </label>
              <input
                type="number"
                value={dailyLimit}
                onChange={e => setDailyLimit(e.target.value)}
                min="100"
                max="500000"
                className="input-dark"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              <p className="mt-1.5 text-[11px] text-gray-600">You can adjust this limit at any time</p>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
