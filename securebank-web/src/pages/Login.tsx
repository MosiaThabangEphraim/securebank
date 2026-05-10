import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Mail, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [slowWarning, setSlowWarning] = useState(false)
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) {
      slowTimer.current = setTimeout(() => setSlowWarning(true), 8000)
    } else {
      if (slowTimer.current) clearTimeout(slowTimer.current)
      setSlowWarning(false)
    }
    return () => { if (slowTimer.current) clearTimeout(slowTimer.current) }
  }, [loading])

  const handleForgotPassword = async () => {
    if (!email.trim()) { toast.error('Enter your email address first'); return }
    setResetLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      toast.success('Password reset link sent — check your inbox.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setResetLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Please enter your email address'); return }
    if (!password) { toast.error('Please enter your password'); return }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        // Record failed attempt — look up user_id via security-definer function
        supabase.rpc('get_user_id_by_email', { p_email: email.trim() })
          .then(({ data: userId }) => {
            supabase.from('login_history').insert({
              id:              crypto.randomUUID(),
              user_id:         userId ?? null,
              email_attempted: email.trim(),
              success:         false,
              failure_reason:  error.message,
              attempted_at:    new Date().toISOString(),
            }).then(null, () => {})
          }, () => {})

        const msg = error.message.toLowerCase()
        if (msg.includes('invalid login credentials')) {
          throw new Error('No account found with this email, or the password is incorrect.')
        }
        if (msg.includes('email not confirmed')) {
          throw new Error('Please confirm your email address before signing in.')
        }
        if (msg.includes('too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment and try again.')
        }
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error('Sign in returned no user. Please try again.')
      }

      // Record successful login (non-blocking)
      supabase.from('login_history').insert({
        id:               crypto.randomUUID(),
        user_id:          data.user.id,
        email_attempted:  email.trim(),
        success:          true,
        attempted_at:     new Date().toISOString(),
      }).then(null, () => {})

toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (error) {
      console.error('[Login] Final error:', error)
      toast.error(error instanceof Error ? error.message : 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(145deg, #0D1B3E 0%, #0A1628 40%, #070B14 100%)' }}>
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-glow-blue">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">SecureBank</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Banking built for<br />
            <span className="text-blue-400">the modern world</span>
          </h1>
          <p className="text-gray-400 text-lg mb-10 leading-relaxed">
            Real-time fraud detection, instant alerts and full control of your finances — all in one place.
          </p>
          <div className="space-y-4">
            {[
              'AI-powered fraud detection on every transaction',
              'Instant card freeze & security controls',
              'Real-time spending alerts & insights',
            ].map((label) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <span className="text-gray-300 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 px-4 py-3 rounded-xl border border-dark-700 bg-dark-800/50 w-fit">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-xs font-semibold text-white">Bank-grade Security</p>
            <p className="text-xs text-gray-500">256-bit AES encryption · PCI DSS compliant</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">SecureBank</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Sign in</h2>
            <p className="text-gray-500 text-sm">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-dark pl-10"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Password
                </label>
                <button type="button" onClick={handleForgotPassword} disabled={resetLoading} className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50">
                  {resetLoading ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-dark pl-10 pr-10"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            {slowWarning && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300 leading-relaxed">
                  Still waiting — check the browser console (F12) for details on where it is stuck.
                </p>
              </div>
            )}
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Create account
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-dark-700 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-600" />
            <span className="text-xs text-gray-600">Secured with 256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  )
}
