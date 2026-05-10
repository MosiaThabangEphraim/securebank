import { useState } from 'react'
import { Modal } from '../shared/Modal'
import { supabase } from '../../lib/supabase'
import type { Account } from '../../types'
import toast from 'react-hot-toast'
import { Landmark, PiggyBank, CreditCard, Check } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  isOpen: boolean
  onClose: () => void
  userId: string
  onCreated: (account: Account) => void
}

const ACCOUNT_TYPES = [
  {
    type: 'cheque',
    label: 'Cheque Account',
    description: 'Everyday transactional account for payments and debit orders',
    icon: Landmark,
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #312e81 100%)',
    color: 'border-blue-500/40 bg-blue-500/10',
    activeColor: 'border-blue-500 bg-blue-500/20',
  },
  {
    type: 'savings',
    label: 'Savings Account',
    description: 'Earn interest on your balance with no monthly fees',
    icon: PiggyBank,
    gradient: 'linear-gradient(135deg, #065f46 0%, #0e7490 100%)',
    color: 'border-emerald-500/40 bg-emerald-500/10',
    activeColor: 'border-emerald-500 bg-emerald-500/20',
  },
  {
    type: 'credit',
    label: 'Credit Account',
    description: 'Flexible credit with competitive interest rates',
    icon: CreditCard,
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
    color: 'border-purple-500/40 bg-purple-500/10',
    activeColor: 'border-purple-500 bg-purple-500/20',
  },
]

function generateAccountNumber(): string {
  // Format: 62 + 10 random digits (SA convention)
  const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('')
  return `62${digits}`
}

export const AddAccountModal: React.FC<Props> = ({ isOpen, onClose, userId, onCreated }) => {
  const [selectedType, setSelectedType] = useState<string>('cheque')
  const [accountName, setAccountName] = useState('')
  const [loading, setLoading] = useState(false)

  const selected = ACCOUNT_TYPES.find(t => t.type === selectedType)!

  const handleCreate = async () => {
    if (!accountName.trim()) {
      toast.error('Please give your account a name')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[AddAccount] session uid:', session?.user?.id ?? 'NO SESSION')

      const newAccount = {
        id: crypto.randomUUID(),
        user_id: userId,
        account_number: generateAccountNumber(),
        account_type: selectedType,
        account_name: accountName.trim(),
        balance: 100000,
        available_balance: 100000,
        currency_code: 'ZAR',
        status: 'active',
        interest_rate: selectedType === 'savings' ? 8.5 : selectedType === 'credit' ? 20.5 : null,
        credit_limit: selectedType === 'credit' ? 15000 : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('accounts')
        .insert(newAccount)
        .select()
        .single()

      if (error) throw error

      toast.success(`${accountName} created successfully!`)

      // Map snake_case to camelCase
      const mapped: Account = {
        id: data.id,
        userId: data.user_id,
        accountNumber: data.account_number,
        accountType: data.account_type,
        accountName: data.account_name,
        balance: data.balance,
        availableBalance: data.available_balance,
        currencyCode: data.currency_code,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }

      onCreated(mapped)
      setAccountName('')
      setSelectedType('cheque')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Open New Account"
      subtitle="Choose the account type that suits your needs"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</>
              : <><Check className="w-4 h-4" />Open Account</>
            }
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Account type selector */}
        <div className="space-y-2">
          {ACCOUNT_TYPES.map((t) => {
            const Icon = t.icon
            const active = selectedType === t.type
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => setSelectedType(t.type)}
                className={clsx(
                  'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                  active ? t.activeColor : `${t.color} hover:border-opacity-70`
                )}
              >
                {/* Mini card preview */}
                <div className="w-12 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: t.gradient }}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{t.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                </div>
                <div className={clsx(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  active ? 'border-blue-400 bg-blue-500' : 'border-dark-600'
                )}>
                  {active && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Account name */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Account Nickname
          </label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder={`e.g. ${selected.label}`}
            className="input-dark"
            maxLength={40}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <p className="mt-1.5 text-[11px] text-gray-600">
            Give it a name you'll recognise — you can change this later
          </p>
        </div>
      </div>
    </Modal>
  )
}
