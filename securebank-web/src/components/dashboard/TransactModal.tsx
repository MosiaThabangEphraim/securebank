import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '../shared/Modal'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import type { Account, Beneficiary, Transaction } from '../../types'
import type { BeneficiaryInput } from '../../hooks/useBeneficiaries'
import type { FraudCheckResult } from '../../lib/fraudScoring'
import toast from 'react-hot-toast'
import {
  Send, Plus, ChevronLeft, Check, Search, ArrowRight,
  ShieldAlert, AlertTriangle, Eye, EyeOff, XCircle,
} from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency, generateReference } from '../../lib/utils'
import { createAlert } from '../../lib/createAlert'
import { SA_BANKS } from './AddBeneficiaryModal'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500',
]
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
const initials    = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

const riskMeta = (score: number) => ({
  bar:   score <= 30 ? 'bg-emerald-500' : score <= 60 ? 'bg-amber-500' : score <= 80 ? 'bg-orange-500' : 'bg-red-500',
  label: score <= 30 ? 'Low' : score <= 60 ? 'Medium' : score <= 80 ? 'High' : 'Critical',
  text:  score <= 30 ? 'text-emerald-400' : score <= 60 ? 'text-amber-400' : score <= 80 ? 'text-orange-400' : 'text-red-400',
})

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'details' | 'addBeneficiary' | 'confirm' | 'fraudWarning' | 'fraudReport'

interface Props {
  isOpen: boolean
  onClose: () => void
  userId: string
  accounts: Account[]
  beneficiaries: Beneficiary[]
  recentTransactions: Transaction[]
  onBeneficiaryAdd: (input: BeneficiaryInput) => Promise<Beneficiary>
  onTransactionComplete: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export const TransactModal: React.FC<Props> = ({
  isOpen, onClose, userId, accounts, beneficiaries, recentTransactions,
  onBeneficiaryAdd, onTransactionComplete,
}) => {

  // ── Core form state ────────────────────────────────────────────────────────
  const [step, setStep]                               = useState<Step>('details')
  const [fromAccountId, setFromAccountId]             = useState(accounts[0]?.id ?? '')
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  const [amount, setAmount]                           = useState('')
  const [description, setDescription]                 = useState('')
  const [search, setSearch]                           = useState('')
  const [transferMode, setTransferMode]               = useState<'beneficiary' | 'own-account'>('beneficiary')
  const [toAccountId, setToAccountId]                 = useState('')

  // ── Add-beneficiary inline ─────────────────────────────────────────────────
  const [newFullName, setNewFullName]           = useState('')
  const [newBankName, setNewBankName]           = useState('')
  const [newBranchCode, setNewBranchCode]       = useState('')
  const [newAccountNumber, setNewAccountNumber] = useState('')
  const [newReference, setNewReference]         = useState('')
  const [addingBen, setAddingBen]               = useState(false)

  // ── Fraud flow ─────────────────────────────────────────────────────────────
  const [fraudResult, setFraudResult]           = useState<FraudCheckResult | null>(null)
  const [showFlicker, setShowFlicker]           = useState(false)
  const [showOverrideInput, setShowOverrideInput] = useState(false)
  const [overridePassword, setOverridePassword] = useState('')
  const [showPassword, setShowPassword]         = useState(false)
  const [submittingOverride, setSubmittingOverride] = useState(false)

  // ── Loading ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)

  // (fraud preferences are read server-side — no client fetch needed)

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeAccounts = accounts.filter(a => a.status === 'active')
  const fromAccount = activeAccounts.find(a => a.id === fromAccountId) ?? activeAccounts[0]
  const amountNum   = parseFloat(amount) || 0
  const newBalance  = (fromAccount?.availableBalance ?? 0) - amountNum

  const filtered = beneficiaries.filter(b =>
    !b.isBlocked && (
      search === '' ||
      b.fullName.toLowerCase().includes(search.toLowerCase()) ||
      b.accountNumber.includes(search) ||
      b.bankName.toLowerCase().includes(search.toLowerCase())
    )
  )

  const detailsValid = transferMode === 'own-account'
    ? !!fromAccount && !!toAccountId && amountNum > 0 && amountNum <= (fromAccount?.availableBalance ?? 0)
    : !!fromAccount && !!selectedBeneficiary && amountNum > 0 && amountNum <= (fromAccount?.availableBalance ?? 0)

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep('details')
    setFromAccountId(accounts[0]?.id ?? '')
    setSelectedBeneficiary(null)
    setAmount(''); setDescription(''); setSearch('')
    setNewFullName(''); setNewBankName(''); setNewBranchCode('')
    setNewAccountNumber(''); setNewReference('')
    setFraudResult(null)
    setShowOverrideInput(false); setOverridePassword(''); setShowPassword(false)
    setTransferMode('beneficiary'); setToAccountId('')
  }

  const handleClose = () => { reset(); onClose() }

  // ── Add beneficiary ────────────────────────────────────────────────────────
  const handleBankChange = (name: string) => {
    setNewBankName(name)
    const bank = SA_BANKS.find(b => b.name === name)
    if (bank) setNewBranchCode(bank.branchCode)
  }

  const handleSaveBeneficiary = async () => {
    if (!newFullName.trim())      { toast.error('Full name required'); return }
    if (!newBankName)             { toast.error('Select a bank'); return }
    if (!newAccountNumber.trim()) { toast.error('Account number required'); return }
    setAddingBen(true)
    try {
      const mapped = await onBeneficiaryAdd({
        fullName:      newFullName.trim(),
        accountNumber: newAccountNumber.trim(),
        bankName:      newBankName,
        branchCode:    newBranchCode.trim() || undefined,
        reference:     newReference.trim()  || undefined,
      })
      toast.success(`${mapped.fullName} added`)
      setSelectedBeneficiary(mapped)
      setNewFullName(''); setNewBankName(''); setNewBranchCode('')
      setNewAccountNumber(''); setNewReference('')
      setStep('details')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add beneficiary')
    } finally {
      setAddingBen(false)
    }
  }

  // ── Fraud alert sound ─────────────────────────────────────────────────────
  const playFraudAlert = () => {
    try {
      const ctx = new AudioContext()
      const times = [0, 0.18, 0.36]
      times.forEach(t => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'square'
        osc.frequency.setValueAtTime(880, ctx.currentTime + t)
        osc.frequency.setValueAtTime(660, ctx.currentTime + t + 0.08)
        gain.gain.setValueAtTime(0.18, ctx.currentTime + t)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15)
        osc.start(ctx.currentTime + t)
        osc.stop(ctx.currentTime + t + 0.15)
      })
    } catch {
      // AudioContext not available — silently skip
    }
  }

  // ── Fraud check on "Review" (server-side via API) ─────────────────────────
  const handleReview = async () => {
    if (transferMode === 'own-account') { setStep('confirm'); return }
    if (!fromAccount || !selectedBeneficiary) { setStep('confirm'); return }

    setLoading(true)
    try {
      const { data } = await api.post('/transactions/score', {
        accountId:     fromAccount.id,
        beneficiaryId: selectedBeneficiary.id,
        amount:        amountNum,
      })

      if (data.flagged) {
        setFraudResult({
          flagged:   true,
          riskScore: data.riskScore,
          riskLevel: data.riskLevel,
          reasons:   data.reasons,
        })
        setShowFlicker(true)
        setTimeout(() => setShowFlicker(false), 900)
        playFraudAlert()
        setStep('fraudWarning')
      } else {
        setStep('confirm')
      }
    } catch {
      // If the fraud check call fails, let the user proceed — the API will still
      // run scoring server-side when the transaction is submitted.
      setStep('confirm')
    } finally {
      setLoading(false)
    }
  }

  // ── Submit transaction ─────────────────────────────────────────────────────
  const submitTransaction = async (status: 'posted' | 'blocked' | 'pending' | 'disputed') => {
    if (!fromAccount || !selectedBeneficiary) return
    if (amountNum <= 0) { toast.error('Enter a valid amount'); return }
    if (amountNum > fromAccount.availableBalance) {
      toast.error(`Insufficient balance — available: ${formatCurrency(fromAccount.availableBalance)}`)
      return
    }
    setLoading(true)
    try {
      const flagNotes = fraudResult
        ? `Fraud flags: ${fraudResult.reasons.map(r => r.rule).join(', ')}`
        : null

      // Submit through .NET API — it validates, fraud-scores server-side, and updates the balance
      const { data: tx } = await api.post('/transactions', {
        accountId:       fromAccount.id,
        beneficiaryId:   selectedBeneficiary.id,
        amount:          amountNum,
        direction:       'debit',
        status,
        description:     description.trim() || `Payment to ${selectedBeneficiary.fullName}`,
        referenceNumber: generateReference(),
        notes:           (status === 'blocked' || status === 'disputed') ? flagNotes : null,
      })

      const txId = tx.id as string

      if (status === 'disputed') {
        await api.post('/fraud/cases', {
          transactionId: txId,
          reason:        'User flagged transaction as suspicious',
          description:   fraudResult
            ? fraudResult.reasons.map(r => `${r.rule}: ${r.detail}`).join('\n')
            : 'User manually flagged this transaction as potentially fraudulent.',
        })
      }

      toast.success(
        status === 'disputed'
          ? 'Transaction blocked and dispute case opened'
          : status === 'blocked'
          ? 'Transaction blocked'
          : status === 'pending'
          ? 'Transaction placed in Review Zone — approve or reject it when ready'
          : `${formatCurrency(amountNum)} sent to ${selectedBeneficiary.fullName}`
      )

      // Fire alert (non-blocking — don't let alert failure cancel a successful transaction)
      createAlert({
        userId,
        alertType: status === 'disputed' ? 'dispute' : status === 'blocked' ? 'fraud' : status === 'pending' ? 'review' : 'transaction',
        title: status === 'disputed'
          ? 'Fraud Dispute Opened'
          : status === 'blocked'
          ? 'Transaction Blocked'
          : status === 'pending'
          ? 'Transaction in Review'
          : 'Payment Sent',
        message: status === 'disputed'
          ? `A dispute has been opened for your blocked payment of ${formatCurrency(amountNum)} to ${selectedBeneficiary.fullName}.`
          : status === 'blocked'
          ? `Your payment of ${formatCurrency(amountNum)} to ${selectedBeneficiary.fullName} was blocked due to fraud risk.`
          : status === 'pending'
          ? `Your payment of ${formatCurrency(amountNum)} to ${selectedBeneficiary.fullName} is awaiting approval in the Review Zone.`
          : `${formatCurrency(amountNum)} sent to ${selectedBeneficiary.fullName}.`,
        transactionId: txId,
      }).catch((e: unknown) => toast.error((e as Error).message))

      onTransactionComplete()
      handleClose()
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err as { message?: string })?.message
        ?? 'Transfer failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Submit internal transfer ───────────────────────────────────────────────
  const submitInternalTransfer = async () => {
    const toAccount = accounts.find(a => a.id === toAccountId)
    if (!fromAccount || !toAccount) return
    if (amountNum <= 0) { toast.error('Enter a valid amount'); return }
    if (amountNum > fromAccount.availableBalance) {
      toast.error(`Insufficient balance — available: ${formatCurrency(fromAccount.availableBalance)}`)
      return
    }
    setLoading(true)
    try {
      await api.post('/transactions/internal-transfer', {
        fromAccountId: fromAccount.id,
        toAccountId:   toAccount.id,
        amount:        amountNum,
        description:   description.trim() || undefined,
      })
      toast.success(`${formatCurrency(amountNum)} transferred to ${toAccount.accountName}`)
      createAlert({
        userId,
        alertType: 'transaction',
        title: 'Transfer Complete',
        message: `${formatCurrency(amountNum)} transferred from ${fromAccount.accountName} to ${toAccount.accountName}.`,
      }).catch((e: unknown) => toast.error((e as Error).message))
      onTransactionComplete()
      handleClose()
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err as { message?: string })?.message
        ?? 'Transfer failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Password override ──────────────────────────────────────────────────────
  const handlePasswordOverride = async () => {
    if (!overridePassword.trim()) { toast.error('Enter your password'); return }
    setSubmittingOverride(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) throw new Error('Session expired — please log in again')
      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: overridePassword,
      })
      if (error) throw new Error('Incorrect password')
      await submitTransaction('posted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Override failed')
    } finally {
      setSubmittingOverride(false)
    }
  }

  // ── Modal title / subtitle per step ──────────────────────────────────────
  const titles: Record<Step, string>    = {
    details:        'Send Money',
    addBeneficiary: 'New Beneficiary',
    confirm:        'Confirm Transfer',
    fraudWarning:   'Transaction Flagged',
    fraudReport:    'Report as Fraud',
  }
  const subtitles: Record<Step, string> = {
    details:        'Transfer funds to a saved beneficiary',
    addBeneficiary: 'Add a new payment recipient',
    confirm:        'Review your transfer before sending',
    fraudWarning:   'Our system has detected potential risk — please review',
    fraudReport:    'Choose how to handle this flagged transaction',
  }

  const meta = fraudResult ? riskMeta(fraudResult.riskScore) : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Full-screen red flicker overlay (portal) */}
      {showFlicker && createPortal(
        <div className="fixed inset-0 z-[200] pointer-events-none animate-fraud-flicker" />,
        document.body
      )}

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={titles[step]}
        subtitle={subtitles[step]}
        size={step === 'fraudWarning' || step === 'fraudReport' ? 'xl' : 'md'}
        danger={step === 'fraudWarning' || step === 'fraudReport'}
        footer={
          step === 'details' ? (
            <>
              <button onClick={handleClose} className="btn-secondary">Cancel</button>
              <button onClick={handleReview} disabled={!detailsValid || loading} className="btn-primary flex items-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Checking...</>
                  : <>Review <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </>
          ) : step === 'addBeneficiary' ? (
            <>
              <button onClick={() => setStep('details')} className="btn-secondary flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={handleSaveBeneficiary} disabled={addingBen} className="btn-primary flex items-center gap-2">
                {addingBen
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                  : <><Check className="w-4 h-4" />Save Beneficiary</>
                }
              </button>
            </>
          ) : step === 'confirm' ? (
            <>
              <button onClick={() => setStep('details')} className="btn-secondary flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex items-center gap-3">
                {transferMode !== 'own-account' && (
                  <button onClick={() => submitTransaction('pending')} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-400 font-semibold text-sm transition-all disabled:opacity-50">
                    <Eye className="w-4 h-4" />{loading ? 'Saving…' : 'Put in Review'}
                  </button>
                )}
                <button onClick={() => transferMode === 'own-account' ? submitInternalTransfer() : submitTransaction('posted')} disabled={loading} className="btn-primary flex items-center gap-2">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
                    : <><Send className="w-4 h-4" />Confirm Transfer</>
                  }
                </button>
              </div>
            </>
          ) : step === 'fraudWarning' ? (
            /* fraudWarning footer — 4 equal-width buttons in a grid */
            <div className="grid grid-cols-4 gap-2 w-full">
              <button
                onClick={() => setStep('fraudReport')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-semibold text-xs transition-all disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Report as Fraud
              </button>
              <button
                onClick={handleClose}
                className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-dark-700 hover:bg-dark-600 border border-dark-600 text-gray-300 font-semibold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => submitTransaction('pending')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-400 font-semibold text-xs transition-all disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                {loading ? 'Saving…' : 'Put in Review'}
              </button>
              <button
                onClick={showOverrideInput ? handlePasswordOverride : () => setShowOverrideInput(true)}
                disabled={showOverrideInput && (submittingOverride || !overridePassword.trim())}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-semibold text-xs transition-all disabled:opacity-50"
              >
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                {submittingOverride ? 'Verifying…' : 'Proceed Anyway'}
              </button>
            </div>
          ) : (
            /* fraudReport footer */
            <>
              <button onClick={() => setStep('fraudWarning')} className="btn-secondary flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <div className="flex gap-3">
                <button onClick={() => submitTransaction('blocked')} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-semibold text-sm disabled:opacity-50">
                  {loading ? 'Blocking…' : 'Block Only'}
                </button>
                <button onClick={() => submitTransaction('disputed')} disabled={loading} className="btn-primary flex items-center gap-2">
                  {loading ? 'Opening…' : 'Block & Open Dispute'}
                </button>
              </div>
            </>
          )
        }
      >

        {/* ── Details step ─────────────────────────────────────────────────── */}
        {step === 'details' && (
          <div className="space-y-5">
            {/* Transfer mode toggle */}
            {activeAccounts.length > 1 && (
              <div className="flex rounded-xl bg-dark-800 border border-dark-700 p-1 gap-1">
                <button onClick={() => setTransferMode('beneficiary')} className={clsx('flex-1 py-2 rounded-lg text-xs font-semibold transition-all', transferMode === 'beneficiary' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white')}>
                  Pay Beneficiary
                </button>
                <button onClick={() => setTransferMode('own-account')} className={clsx('flex-1 py-2 rounded-lg text-xs font-semibold transition-all', transferMode === 'own-account' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white')}>
                  My Accounts
                </button>
              </div>
            )}

            {/* From account */}
            {accounts.length > 1 ? (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">From Account</label>
                <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} className="input-dark">
                  {activeAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountName} — {formatCurrency(a.availableBalance)}</option>
                  ))}
                </select>
              </div>
            ) : fromAccount && (
              <div className="p-3 rounded-xl bg-dark-800/60 border border-dark-700">
                <p className="text-xs text-gray-500 mb-1">From</p>
                <p className="text-sm font-semibold text-white">{fromAccount.accountName}</p>
                <p className="text-xs text-gray-400">{fromAccount.accountNumber} · Available: {formatCurrency(fromAccount.availableBalance)}</p>
              </div>
            )}

            {/* To: own account or beneficiary */}
            {transferMode === 'own-account' ? (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">To Account</label>
                <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} className="input-dark">
                  <option value="">Select destination account</option>
                  {activeAccounts.filter(a => a.id !== fromAccountId).map(a => (
                    <option key={a.id} value={a.id}>{a.accountName} — {formatCurrency(a.availableBalance)}</option>
                  ))}
                </select>
              </div>
            ) : (
              /* Beneficiary selection */
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pay To</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search beneficiaries…" className="input-dark pl-9" />
                </div>
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
                  {beneficiaries.filter(b => !b.isBlocked).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-6">No beneficiaries yet — add one below</p>
                  )}
                  {filtered.length === 0 && beneficiaries.filter(b => !b.isBlocked).length > 0 && (
                    <p className="text-xs text-gray-500 text-center py-4">No matches for "{search}"</p>
                  )}
                  {filtered.map(b => {
                    const active = selectedBeneficiary?.id === b.id
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBeneficiary(b)}
                        className={clsx(
                          'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                          active ? 'border-blue-500 bg-blue-500/10' : 'border-dark-700 bg-dark-800/40 hover:border-dark-600'
                        )}
                      >
                        <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', avatarColor(b.fullName))}>
                          {initials(b.fullName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-white truncate">{b.fullName}</p>
                            {b.isVerified && <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-0.5"><Check className="w-2.5 h-2.5" /> Verified</span>}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{b.bankName} · {b.accountNumber}</p>
                        </div>
                        {active && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setStep('addBeneficiary')}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-dark-600 text-gray-400 hover:border-blue-500/50 hover:text-blue-400 transition-all text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Add New Beneficiary
                </button>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amount (ZAR)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm pointer-events-none">R</span>
                <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="input-dark pl-8" />
              </div>
              {fromAccount && amountNum > fromAccount.availableBalance && amountNum > 0 && (
                <p className="mt-1 text-xs text-red-400">Insufficient balance — available: {formatCurrency(fromAccount.availableBalance)}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Description <span className="text-gray-600 normal-case font-normal">(optional)</span>
              </label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Rent payment" className="input-dark" maxLength={100} />
            </div>
          </div>
        )}

        {/* ── Add-beneficiary inline step ───────────────────────────────────── */}
        {step === 'addBeneficiary' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
              <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)} placeholder="e.g. John Smith" className="input-dark" maxLength={80} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bank</label>
              <select value={newBankName} onChange={e => handleBankChange(e.target.value)} className="input-dark">
                <option value="">Select a bank</option>
                {SA_BANKS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Number</label>
                <input type="text" value={newAccountNumber} onChange={e => setNewAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="1234567890" className="input-dark" maxLength={20} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Branch Code</label>
                <input type="text" value={newBranchCode} onChange={e => setNewBranchCode(e.target.value.replace(/\D/g, ''))} placeholder="632005" className="input-dark" maxLength={6} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Their Reference <span className="text-gray-600 normal-case font-normal">(optional)</span>
              </label>
              <input type="text" value={newReference} onChange={e => setNewReference(e.target.value)} placeholder="What appears on their statement" className="input-dark" maxLength={40} />
            </div>
          </div>
        )}

        {/* ── Confirm step ─────────────────────────────────────────────────── */}
        {step === 'confirm' && fromAccount && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Transfer Amount</p>
              <p className="text-4xl font-bold text-white">{formatCurrency(amountNum)}</p>
            </div>
            <div className="rounded-xl bg-dark-800/60 border border-dark-700 divide-y divide-dark-700">
              <div className="flex items-center justify-between p-4">
                <span className="text-xs text-gray-500">From</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{fromAccount.accountName}</p>
                  <p className="text-xs text-gray-500">{fromAccount.accountNumber}</p>
                </div>
              </div>
              {transferMode === 'own-account' ? (
                <div className="flex items-center justify-between p-4">
                  <span className="text-xs text-gray-500">To</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{accounts.find(a => a.id === toAccountId)?.accountName}</p>
                    <p className="text-xs text-gray-500">{accounts.find(a => a.id === toAccountId)?.accountNumber}</p>
                  </div>
                </div>
              ) : selectedBeneficiary && (
                <>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-xs text-gray-500">To</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{selectedBeneficiary.fullName}</p>
                      <p className="text-xs text-gray-500">{selectedBeneficiary.bankName} · {selectedBeneficiary.accountNumber}</p>
                    </div>
                  </div>
                </>
              )}
              {description && (
                <div className="flex items-center justify-between p-4">
                  <span className="text-xs text-gray-500">Description</span>
                  <span className="text-sm text-gray-300">{description}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-4">
                <span className="text-xs text-gray-500">Balance after</span>
                <span className={clsx('text-sm font-semibold', newBalance >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatCurrency(newBalance)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Fraud warning step ───────────────────────────────────────────── */}
        {step === 'fraudWarning' && fraudResult && meta && (
          <div className="space-y-5">

            {/* Risk score header */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-red-500/8 border border-red-500/20">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Risk Score</span>
                  <span className={clsx('text-sm font-bold', meta.text)}>{fraudResult.riskScore}/100 — {meta.label}</span>
                </div>
                <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all', meta.bar)}
                    style={{ width: `${fraudResult.riskScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Triggered rules */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Triggered Rules</p>
              {fraudResult.reasons.map((r, i) => (
                <div key={i} className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">{r.rule}</span>
                    <span className="text-[10px] text-red-400/60 font-mono">+{r.score} pts</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{r.detail}</p>
                </div>
              ))}
            </div>

            {/* Transfer summary (compact) */}
            {fromAccount && selectedBeneficiary && (
              <div className="rounded-xl bg-dark-800/60 border border-dark-700 divide-y divide-dark-700 text-xs">
                <div className="flex justify-between p-3">
                  <span className="text-gray-500">Sending</span>
                  <span className="font-bold text-white">{formatCurrency(amountNum)}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-gray-500">To</span>
                  <span className="text-gray-300">{selectedBeneficiary.fullName} · {selectedBeneficiary.bankName}</span>
                </div>
              </div>
            )}

            {/* Password override input (inline) */}
            {showOverrideInput && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Confirm your identity to override</p>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={overridePassword}
                    onChange={e => setOverridePassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePasswordOverride()}
                    placeholder="Enter your account password"
                    className="input-dark pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={handlePasswordOverride}
                  disabled={submittingOverride || !overridePassword.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {submittingOverride
                    ? <><span className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />Verifying...</>
                    : <><ShieldAlert className="w-4 h-4" />Confirm Override & Send</>
                  }
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Fraud report step ────────────────────────────────────────────── */}
        {step === 'fraudReport' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 leading-relaxed">This transaction has been flagged as potentially fraudulent. Choose how to proceed:</p>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-dark-700 bg-dark-800/40">
                <p className="text-sm font-semibold text-white mb-1">Block transaction only</p>
                <p className="text-xs text-gray-500">The transaction will be blocked with status "Blocked". No formal case is opened.</p>
              </div>
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
                <p className="text-sm font-semibold text-white mb-1">Block and open a dispute</p>
                <p className="text-xs text-gray-500">The transaction will be marked as "Disputed" and a formal fraud case will be opened. It will appear in your Disputes portal.</p>
              </div>
            </div>
          </div>
        )}

      </Modal>
    </>
  )
}
