import { useState } from 'react'
import { Modal } from '../shared/Modal'
import type { Beneficiary } from '../../types'
import type { BeneficiaryInput } from '../../hooks/useBeneficiaries'
import toast from 'react-hot-toast'
import { UserPlus } from 'lucide-react'

export const SA_BANKS = [
  { name: 'ABSA',                   branchCode: '632005' },
  { name: 'Standard Bank',          branchCode: '051001' },
  { name: 'FNB (First National Bank)', branchCode: '250655' },
  { name: 'Nedbank',                branchCode: '198765' },
  { name: 'Capitec Bank',           branchCode: '470010' },
  { name: 'Discovery Bank',         branchCode: '679000' },
  { name: 'African Bank',           branchCode: '430000' },
  { name: 'TymeBank',               branchCode: '678910' },
  { name: 'Investec',               branchCode: '580105' },
  { name: 'Bidvest Bank',           branchCode: '462005' },
  { name: 'Other',                  branchCode: '' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdd: (input: BeneficiaryInput) => Promise<Beneficiary>
  onAdded: (beneficiary: Beneficiary) => void
}

export const AddBeneficiaryModal: React.FC<Props> = ({ isOpen, onClose, onAdd, onAdded }) => {
  const [fullName, setFullName]         = useState('')
  const [bankName, setBankName]         = useState('')
  const [branchCode, setBranchCode]     = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [reference, setReference]       = useState('')
  const [loading, setLoading]           = useState(false)

  const reset = () => {
    setFullName(''); setBankName(''); setBranchCode('')
    setAccountNumber(''); setReference('')
  }

  const handleBankChange = (name: string) => {
    setBankName(name)
    const bank = SA_BANKS.find(b => b.name === name)
    if (bank) setBranchCode(bank.branchCode)
  }

  const handleSave = async () => {
    if (!fullName.trim())     { toast.error('Full name is required'); return }
    if (!bankName)            { toast.error('Please select a bank'); return }
    if (!accountNumber.trim()) { toast.error('Account number is required'); return }

    setLoading(true)
    try {
      const b = await onAdd({
        fullName:      fullName.trim(),
        accountNumber: accountNumber.trim(),
        bankName,
        branchCode:    branchCode.trim() || undefined,
        reference:     reference.trim()  || undefined,
      })
      toast.success(`${b.fullName} added`)
      onAdded(b)
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add beneficiary')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => { onClose(); reset() }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Beneficiary"
      subtitle="Save a recipient for future payments"
      size="md"
      footer={
        <>
          <button onClick={handleClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
              : <><UserPlus className="w-4 h-4" />Add Beneficiary</>
            }
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="e.g. John Smith"
            className="input-dark"
            maxLength={80}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bank</label>
          <select
            value={bankName}
            onChange={e => handleBankChange(e.target.value)}
            className="input-dark"
          >
            <option value="">Select a bank</option>
            {SA_BANKS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Number</label>
            <input
              type="text"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="1234567890"
              className="input-dark"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Branch Code</label>
            <input
              type="text"
              value={branchCode}
              onChange={e => setBranchCode(e.target.value.replace(/\D/g, ''))}
              placeholder="632005"
              className="input-dark"
              maxLength={6}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Their Reference <span className="text-gray-600 normal-case font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="What appears on their statement"
            className="input-dark"
            maxLength={40}
          />
        </div>
      </div>
    </Modal>
  )
}
