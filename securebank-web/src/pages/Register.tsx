import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Lock, Mail, User, ShieldCheck, ArrowRight, ArrowLeft,
  Eye, EyeOff, Check, Phone, MapPin, Calendar, CreditCard, Globe,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import clsx from 'clsx'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:5093/api'

async function checkAvailability(payload: { phoneNumber?: string; nationalId?: string; email?: string }) {
  const res = await fetch(`${API_BASE}/auth/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<{ phoneTaken: boolean; nationalIdTaken: boolean; emailTaken: boolean }>
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface FormData {
  fullName: string
  dateOfBirth: string
  nationalId: string
  phoneNumber: string
  address: string
  city: string
  countryCode: string
  email: string
  password: string
  confirmPassword: string
}

const STEPS = [
  { number: 1, label: 'Personal' },
  { number: 2, label: 'Contact' },
  { number: 3, label: 'Credentials' },
]

const COUNTRIES = [
  { code: 'ZA', name: 'South Africa' },
  { code: 'ZW', name: 'Zimbabwe' },
  { code: 'BW', name: 'Botswana' },
  { code: 'NA', name: 'Namibia' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'OTHER', name: 'Other' },
]

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done = step.number < current
        const active = step.number === current
        return (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                done  ? 'bg-emerald-500 border-emerald-500 text-white' :
                active ? 'bg-blue-600 border-blue-500 text-white' :
                         'bg-dark-800 border-dark-600 text-gray-500'
              )}>
                {done ? <Check className="w-4 h-4" /> : step.number}
              </div>
              <span className={clsx(
                'text-[10px] font-semibold uppercase tracking-wider hidden sm:block',
                active ? 'text-blue-400' : done ? 'text-emerald-400' : 'text-gray-600'
              )}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx(
                'flex-1 h-px mx-2 mb-5 transition-all',
                done ? 'bg-emerald-500/60' : 'bg-dark-700'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
        {optional && <span className="text-[10px] text-gray-600 font-medium">Optional</span>}
      </div>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export const Register: React.FC = () => {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate()

  const [form, setForm] = useState<FormData>({
    fullName: '',
    dateOfBirth: '',
    nationalId: '',
    phoneNumber: '',
    address: '',
    city: '',
    countryCode: 'ZA',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  // Password strength
  const passwordStrength = (() => {
    if (!form.password) return 0
    let s = 0
    if (form.password.length >= 8) s++
    if (/[A-Z]/.test(form.password)) s++
    if (/[0-9]/.test(form.password)) s++
    if (/[^A-Za-z0-9]/.test(form.password)) s++
    return s
  })()
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength]
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500'][passwordStrength]

  // ─── Validation ────────────────────────────────────────────────────────────
  const validateStep = (): boolean => {
    if (step === 1) {
      if (!form.fullName.trim()) { toast.error('Full name is required'); return false }
      if (form.fullName.trim().split(' ').filter(Boolean).length < 2) { toast.error('Please enter your full name (first and last name)'); return false }
      if (form.nationalId.trim()) {
        if (form.countryCode === 'ZA' && !/^\d{13}$/.test(form.nationalId.trim())) {
          toast.error('South African ID number must be exactly 13 digits'); return false
        }
        if (form.countryCode !== 'ZA' && form.nationalId.trim().length < 5) {
          toast.error('Please enter a valid passport or ID number'); return false
        }
      }
      return true
    }
    if (step === 2) {
      if (form.phoneNumber.trim() && !/^\+?[\d\s\-()]{7,15}$/.test(form.phoneNumber.trim())) {
        toast.error('Please enter a valid phone number'); return false
      }
      return true
    }
    if (step === 3) {
      if (!form.email.trim()) { toast.error('Email address is required'); return false }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
        toast.error('Please enter a valid email address'); return false
      }
      if (!form.password) { toast.error('Password is required'); return false }
      if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return false }
      if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return false }
      return true
    }
    return true
  }

  const nextStep = async () => {
    if (!validateStep()) return

    if (step === 1 && form.nationalId.trim()) {
      setLoading(true)
      try {
        const result = await checkAvailability({ nationalId: form.nationalId.trim() })
        if (result.nationalIdTaken) {
          toast.error('An account with this ID number already exists')
          return
        }
      } catch {
        toast.error('Could not verify ID number — please check your connection and try again')
        return
      } finally {
        setLoading(false)
      }
    }

    if (step === 2 && form.phoneNumber.trim()) {
      setLoading(true)
      try {
        const result = await checkAvailability({ phoneNumber: form.phoneNumber.trim() })
        if (result.phoneTaken) {
          toast.error('An account with this phone number already exists')
          return
        }
      } catch {
        toast.error('Could not verify phone number — please check your connection and try again')
        return
      } finally {
        setLoading(false)
      }
    }

    setStep((s) => Math.min(s + 1, 3))
  }

  // ─── Step 3: Create auth user, then redirect to login ────────────────────
  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateStep()) return
    setLoading(true)

    const profileMeta = {
      full_name:     form.fullName.trim(),
      phone_number:  form.phoneNumber  || null,
      national_id:   form.nationalId   || null,
      date_of_birth: form.dateOfBirth  || null,
      address:       form.address      || null,
      city:          form.city         || null,
      country_code:  form.countryCode  || 'ZA',
    }

    try {
      // Pre-check email uniqueness against auth.users via API
      const emailCheck = await checkAvailability({ email: form.email.trim() }).catch(() => null)
      if (emailCheck?.emailTaken) {
        throw new Error('An account with this email already exists. Please sign in instead.')
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: profileMeta },
      })

      if (error) throw new Error(error.message)

      // Upsert profile row — non-critical, user can update later
      if (data.user) {
        await supabase
          .from('profiles')
          .upsert({ id: data.user.id, ...profileMeta, is_locked: false, failed_login_count: 0 }, { onConflict: 'id' })
          .then(null, () => {})
      }

      // data.session is null when email confirmation is required
      toast.success(
        data.session
          ? 'Account created! Redirecting...'
          : 'Account created! Check your email to confirm before signing in.'
      )
      navigate('/login')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formSubmitHandler =
    step === 3
      ? handleCreateAccount
      : async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); await nextStep() }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex lg:w-[42%] relative overflow-hidden flex-col justify-between p-12 flex-shrink-0"
        style={{ background: 'linear-gradient(145deg, #0D1B3E 0%, #0A1628 40%, #070B14 100%)' }}
      >
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-glow-blue">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">SecureBank</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Open your account<br />
            <span className="text-blue-400">in minutes</span>
          </h1>
          <p className="text-gray-400 text-lg mb-10 leading-relaxed">
            Join thousands of customers who trust SecureBank for secure, modern banking.
          </p>
          <div className="space-y-4">
            {[
              'Free account — no monthly fees',
              'Add accounts and cards inside the app',
              'AI-powered real-time fraud protection',
              'FICA-compliant identity verification',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-gray-300 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 px-4 py-3 rounded-xl border border-dark-700 bg-dark-800/50 w-fit">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-xs font-semibold text-white">Bank-grade Security</p>
            <p className="text-xs text-gray-500">256-bit AES encryption · FICA · PCI DSS</p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-start justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-lg py-4">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">SecureBank</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
            <p className="text-gray-500 text-sm">
              Step {step} of {STEPS.length} — {STEPS[step - 1].label} details
            </p>
          </div>

          <StepBar current={step} />

          <form onSubmit={formSubmitHandler}>
            {/* ── STEP 1: Personal ── */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <Field label="Full Name">
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={set('fullName')}
                      placeholder="e.g. Thabo Nkosi"
                      className="input-dark pl-10"
                      required
                      autoComplete="name"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-600">Enter your full legal name as it appears on your ID</p>
                </Field>

                <Field label="Date of Birth" optional>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={set('dateOfBirth')}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                      className="input-dark pl-10"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-600">You must be at least 18 years old to open an account</p>
                </Field>

                <Field label="ID / Passport Number" optional>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={form.nationalId}
                      onChange={set('nationalId')}
                      placeholder="e.g. 9001015800083"
                      className="input-dark pl-10 font-mono tracking-wider"
                      maxLength={20}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-600">Required for FICA compliance — stored encrypted</p>
                </Field>
              </div>
            )}

            {/* ── STEP 2: Contact ── */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <Field label="Phone Number" optional>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      value={form.phoneNumber}
                      onChange={set('phoneNumber')}
                      placeholder="+27 82 123 4567"
                      className="input-dark pl-10"
                      autoComplete="tel"
                    />
                  </div>
                </Field>

                <Field label="Street Address" optional>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={form.address}
                      onChange={set('address')}
                      placeholder="123 Main Street, Sandton"
                      className="input-dark pl-10"
                      autoComplete="street-address"
                    />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="City" optional>
                    <input
                      type="text"
                      value={form.city}
                      onChange={set('city')}
                      placeholder="Johannesburg"
                      className="input-dark"
                      autoComplete="address-level2"
                    />
                  </Field>

                  <Field label="Country">
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      <select
                        value={form.countryCode}
                        onChange={set('countryCode')}
                        className="input-dark pl-10 appearance-none cursor-pointer"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </Field>
                </div>

                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                  <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Your contact details are used for security alerts and account recovery. All fields on this step are optional but recommended.
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP 3: Credentials ── */}
            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                <Field label="Email Address">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="you@example.com"
                      className="input-dark pl-10"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-600">This will be your login and primary contact email</p>
                </Field>

                <Field label="Password">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={set('password')}
                      placeholder="••••••••"
                      className="input-dark pl-10 pr-10"
                      required
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1.5">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength ? strengthColor : 'bg-dark-600'}`} />
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-500">{strengthLabel} password
                        {passwordStrength < 3 && <span className="text-gray-600"> — use uppercase, numbers & symbols</span>}
                      </p>
                    </div>
                  )}
                </Field>

                <Field label="Confirm Password">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={set('confirmPassword')}
                      placeholder="••••••••"
                      className={clsx(
                        'input-dark pl-10 pr-10',
                        form.confirmPassword && form.confirmPassword !== form.password && 'border-red-500/60 focus:border-red-500',
                        form.confirmPassword && form.confirmPassword === form.password && 'border-emerald-500/60',
                      )}
                      required
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.confirmPassword && form.confirmPassword !== form.password && (
                    <p className="mt-1.5 text-xs text-red-400">Passwords do not match</p>
                  )}
                  {form.confirmPassword && form.confirmPassword === form.password && (
                    <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </Field>

                {/* Summary */}
                <div className="rounded-xl border border-dark-700 bg-dark-800/40 p-4 space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Account Summary</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Name</span>
                    <span className="text-xs text-white font-medium">{form.fullName || '—'}</span>
                  </div>
                  {form.dateOfBirth && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Date of birth</span>
                      <span className="text-xs text-white font-medium">{form.dateOfBirth}</span>
                    </div>
                  )}
                  {form.phoneNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Phone</span>
                      <span className="text-xs text-white font-medium">{form.phoneNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Country</span>
                    <span className="text-xs text-white font-medium">
                      {COUNTRIES.find((c) => c.code === form.countryCode)?.name ?? form.countryCode}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Navigation buttons ── */}
            <div className={clsx('flex gap-3 mt-8', step > 1 ? 'justify-between' : 'justify-end')}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}

              <button
                type="submit"
                disabled={loading || (step === 3 && !!form.confirmPassword && form.confirmPassword !== form.password) || (step === 3 && form.password.length > 0 && form.password.length < 8)}
                className="btn-primary flex items-center gap-2 flex-1 justify-center"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </>
                ) : step === 3 ? (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                ) : (
                  <>Continue <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>

          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>

          <div className="mt-6 pt-5 border-t border-dark-700 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-600">256-bit AES encryption · POPIA compliant · FICA verified</span>
          </div>
        </div>
      </div>
    </div>
  )
}
