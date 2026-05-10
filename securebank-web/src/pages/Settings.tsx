import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppShell } from '../components/layout/AppShell'
import { supabase } from '../lib/supabase'
import type { Account } from '../types'
import { Mail, Lock, Camera, Trash2, AlertTriangle, Eye, EyeOff, Upload, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { createAlert } from '../lib/createAlert'

export const Settings: React.FC = () => {
  const navigate   = useNavigate()
  const { user, loading: authLoading } = useAuth()

  // ── Email update ────────────────────────────────────────────────────────────
  const [newEmail, setNewEmail]         = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  // ── Password update ─────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw]         = useState('')
  const [newPassword, setNewPassword]     = useState('')
  const [confirmPw, setConfirmPw]         = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showPw, setShowPw]               = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [pwLoading, setPwLoading]         = useState(false)

  const passwordStrength = (() => {
    if (!newPassword) return 0
    let s = 0
    if (newPassword.length >= 8)          s++
    if (/[A-Z]/.test(newPassword))        s++
    if (/[0-9]/.test(newPassword))        s++
    if (/[^A-Za-z0-9]/.test(newPassword)) s++
    return s
  })()
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength]
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500'][passwordStrength]

  // ── Profile picture ─────────────────────────────────────────────────────────
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Delete account ──────────────────────────────────────────────────────────
  const [accounts, setAccounts]           = useState<Account[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDelete, setShowDelete]       = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }

    // Load profile picture
    supabase
      .from('profiles')
      .select('profile_picture_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.profile_picture_url) setAvatarUrl(data.profile_picture_url as string)
      })

    // Load accounts (for balance check before delete)
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setAccounts((data ?? []).map((row: Record<string, unknown>) => ({
          id:               row.id as string,
          userId:           row.user_id as string,
          accountNumber:    row.account_number as string,
          accountType:      row.account_type as string,
          accountName:      row.account_name as string,
          balance:          Number(row.balance),
          availableBalance: Number(row.available_balance),
          currencyCode:     (row.currency_code as string) || 'ZAR',
          status:           row.status as string,
          interestRate:     row.interest_rate ? Number(row.interest_rate) : undefined,
          creditLimit:      row.credit_limit  ? Number(row.credit_limit)  : undefined,
          createdAt:        row.created_at as string,
          updatedAt:        row.updated_at as string,
        })))
      })
  }, [user, authLoading, navigate])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleEmailUpdate = async () => {
    if (!newEmail.trim()) { toast.error('Enter a new email address'); return }
    setEmailLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error
      toast.success('Check your inbox to confirm the new email.')
      if (user) createAlert({ userId: user.id, alertType: 'security', title: 'Email Address Change Requested', message: `A request to change your email address to ${newEmail.trim()} was made. Check your inbox to confirm.` }).catch(console.error)
      setNewEmail('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update email')
    } finally {
      setEmailLoading(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (!currentPw) { toast.error('Enter your current password'); return }
    if (!newPassword) { toast.error('Enter a new password'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPw) { toast.error('Passwords do not match'); return }
    setPwLoading(true)
    try {
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user!.email,
        password: currentPw,
      })
      if (reAuthError) throw new Error('Current password is incorrect')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated successfully')
      if (user) createAlert({ userId: user.id, alertType: 'security', title: 'Password Changed', message: 'Your SecureBank password was successfully changed. If you did not make this change, contact support immediately.' }).catch(console.error)
      setCurrentPw(''); setNewPassword(''); setConfirmPw('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPwLoading(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarLoading(true)
    try {
      const path = `${user.id}/${file.name}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = data.publicUrl
      const { error: profileErr } = await supabase.from('profiles').update({ profile_picture_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', user.id)
      if (profileErr) throw profileErr
      setAvatarUrl(publicUrl)
      toast.success('Profile picture updated')
      createAlert({ userId: user.id, alertType: 'security', title: 'Profile Picture Updated', message: 'Your profile picture was successfully updated.' }).catch(console.error)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload avatar')
    } finally {
      setAvatarLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { toast.error('Type DELETE to confirm'); return }
    if (!user) return

    // Check if any account has a balance
    const hasBalance = accounts.some(a => a.availableBalance > 0)
    if (hasBalance) {
      toast.error('You have accounts with remaining balance. Please withdraw all funds before deleting your account.')
      return
    }

    setDeleteLoading(true)
    try {
      await supabase.from('beneficiaries').delete().eq('user_id', user.id)
      await supabase.from('alerts').delete().eq('user_id', user.id)
      await supabase.from('fraud_cases').delete().eq('user_id', user.id)
      for (const acc of accounts) {
        await supabase.from('transactions').delete().eq('account_id', acc.id)
      }
      await supabase.from('accounts').delete().eq('user_id', user.id)
      await supabase.from('login_history').delete().eq('user_id', user.id)
      await supabase.from('profiles').delete().eq('id', user.id)
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account')
      setDeleteLoading(false)
    }
  }

  if (authLoading) {
    return (
      <AppShell>
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-dark-850 animate-pulse" />)}
        </div>
      </AppShell>
    )
  }

  const initials = user?.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  return (
    <AppShell>
      <div className="p-6 space-y-6 animate-fade-in max-w-2xl">

        {/* ── Profile Picture ─────────────────────────────────────────────────── */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Camera className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Profile Picture</h3>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-dark-600" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white">
                  {initials}
                </div>
              )}
              {avatarLoading && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={avatarLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 text-sm font-semibold transition-all disabled:opacity-50"
              >
                <Upload className="w-4 h-4" /> {avatarLoading ? 'Uploading…' : 'Upload Photo'}
              </button>
              <p className="text-xs text-gray-500">JPG, PNG or GIF, max 5MB</p>
            </div>
          </div>
        </div>

        {/* ── Security — Change Email ─────────────────────────────────────────── */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Change Email</h3>
          </div>
          <p className="text-xs text-gray-500">Current: <span className="text-gray-300">{user?.email}</span></p>
          <div className="space-y-3">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="New email address"
              className="input-dark"
            />
            <button
              onClick={handleEmailUpdate}
              disabled={emailLoading || !newEmail.trim()}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
            >
              {emailLoading ? 'Sending…' : 'Update Email'}
            </button>
          </div>
        </div>

        {/* ── Security — Change Password ─────────────────────────────────────── */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Change Password</h3>
          </div>
          <div className="space-y-3">
            {/* Current password */}
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Current password"
                className="input-dark pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* New password */}
            <div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="input-dark pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {newPassword.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength ? strengthColor : 'bg-dark-600'}`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {strengthLabel} password
                    {passwordStrength < 3 && (
                      <span className="text-gray-600"> — use uppercase, numbers &amp; symbols</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Confirm new password"
                  className={`input-dark pr-10 ${
                    confirmPw && confirmPw !== newPassword ? 'border-red-500/60 focus:border-red-500' : ''
                  } ${
                    confirmPw && confirmPw === newPassword ? 'border-emerald-500/60' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPw && confirmPw !== newPassword && (
                <p className="mt-1.5 text-xs text-red-400">Passwords do not match</p>
              )}
              {confirmPw && confirmPw === newPassword && (
                <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            <button
              onClick={handlePasswordUpdate}
              disabled={pwLoading || !currentPw || !newPassword || !confirmPw || newPassword !== confirmPw}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
            >
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* ── Danger Zone ────────────────────────────────────────────────────── */}
        <div className="card p-6 space-y-4 border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Permanently delete your SecureBank account and all associated data. This action cannot be undone.
            All transactions, accounts, beneficiaries, and fraud cases will be erased.
          </p>
          {accounts.some(a => a.availableBalance > 0) && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400 font-medium">
                You have accounts with remaining balance. Withdraw all funds before deleting your account.
              </p>
            </div>
          )}
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-all"
            >
              <Trash2 className="w-4 h-4" /> Delete My Account
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-xs font-semibold text-red-400">Type <span className="font-mono bg-red-500/20 px-1.5 py-0.5 rounded">DELETE</span> to confirm account deletion:</p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE"
                className="input-dark border-red-500/30 focus:border-red-500/60"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowDelete(false); setDeleteConfirm('') }}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirm !== 'DELETE'}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <><span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />Deleting…</>
                  ) : (
                    <><Trash2 className="w-4 h-4" />Confirm Delete</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
