import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppShell } from '../components/layout/AppShell'
import { api } from '../lib/api'
import type { UserFraudPreferences } from '../types'
import {
  Zap, TrendingUp, Clock, Wallet, Droplets,
  Copy, CalendarX, ShieldCheck, RotateCcw, Save,
  Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ─── Defaults (matches what the trigger inserts) ──────────────────────────────
const DEFAULTS: Omit<UserFraudPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  velocityEnabled: true,
  velocityMaxTxCount: 5,
  velocityWindowMinutes: 60,
  amountCheckEnabled: true,
  amountMultiplier: 3,
  timeCheckEnabled: false,
  activeHoursStart: 7,
  activeHoursEnd: 22,
  dailyLimitEnabled: false,
  dailySpendLimit: 10000,
  balanceDrainEnabled: true,
  balanceDrainPercent: 80,
  balanceDrainWindowMinutes: 30,
  duplicateCheckEnabled: true,
  duplicateWindowMinutes: 10,
  duplicateAmountThreshold: 1,
  inactiveDaysEnabled: false,
  inactiveDays: [],
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Rule card wrapper ────────────────────────────────────────────────────────
function RuleCard({
  title,
  description,
  icon: Icon,
  iconColor,
  enabled,
  onToggle,
  children,
  riskLevel,
}: {
  title: string
  description: string
  icon: React.ElementType
  iconColor: string
  enabled: boolean
  onToggle: () => void
  children?: React.ReactNode
  riskLevel?: 'low' | 'medium' | 'high'
}) {
  const [expanded, setExpanded] = useState(enabled)

  const riskColors = {
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    high: 'text-red-400 bg-red-500/10 border-red-500/20',
  }

  return (
    <div className={clsx(
      'rounded-2xl border transition-all duration-200',
      enabled ? 'border-dark-600 bg-dark-850' : 'border-dark-700 bg-dark-900/50'
    )}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
            enabled ? iconColor : 'bg-dark-700 text-gray-600'
          )}>
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={clsx('text-sm font-semibold', enabled ? 'text-white' : 'text-gray-500')}>{title}</p>
              {riskLevel && enabled && (
                <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full border', riskColors[riskLevel])}>
                  {riskLevel} risk
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {children && enabled && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition-all"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            {/* Toggle */}
            <button
              onClick={() => { onToggle(); if (!enabled) setExpanded(true) }}
              className={clsx(
                'relative w-10 h-6 rounded-full transition-all duration-200 flex-shrink-0',
                enabled ? 'bg-blue-500' : 'bg-dark-600'
              )}
            >
              <span className={clsx(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                enabled ? 'translate-x-4' : 'translate-x-0'
              )} />
            </button>
          </div>
        </div>
      </div>

      {/* Parameters */}
      {enabled && expanded && children && (
        <div className="px-5 pb-5 pt-0 border-t border-dark-700/60 mt-0 space-y-4">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  )
}

// ─── Slider input ─────────────────────────────────────────────────────────────
function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  hint?: string
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-400">{label}</label>
        <span className="text-xs font-bold text-white text-amount">
          {value}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${pct}%, #1e293b ${pct}%, #1e293b 100%)`,
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-600">{min}{unit ? ` ${unit}` : ''}</span>
        <span className="text-[10px] text-gray-600">{max}{unit ? ` ${unit}` : ''}</span>
      </div>
      {hint && <p className="text-[11px] text-gray-600 mt-1.5">{hint}</p>}
    </div>
  )
}

// ─── Number input ─────────────────────────────────────────────────────────────
function NumberField({
  label,
  value,
  min,
  prefix,
  suffix,
  onChange,
  hint,
}: {
  label: string
  value: number
  min?: number
  prefix?: string
  suffix?: string
  onChange: (v: number) => void
  hint?: string
}) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => { setDraft(String(value)) }, [value])

  const commit = () => {
    const n = parseFloat(draft)
    if (!isNaN(n) && (min === undefined || n >= min)) onChange(n)
    else setDraft(String(value))
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-2">{label}</label>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm text-gray-500 flex-shrink-0">{prefix}</span>}
        <input
          type="number"
          value={draft}
          min={min}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
          className="input-dark flex-1"
        />
        {suffix && <span className="text-sm text-gray-500 flex-shrink-0">{suffix}</span>}
      </div>
      {hint && <p className="text-[11px] text-gray-600 mt-1.5">{hint}</p>}
    </div>
  )
}

// ─── Hour picker ──────────────────────────────────────────────────────────────
function HourPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const fmt = (h: number) => {
    const ampm = h < 12 ? 'AM' : 'PM'
    const display = h % 12 === 0 ? 12 : h % 12
    return `${display}:00 ${ampm}`
  }
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-2">{label}</label>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="input-dark w-full"
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>{fmt(i)}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Protection score bar ─────────────────────────────────────────────────────
function ProtectionScore({ prefs }: { prefs: UserFraudPreferences }) {
  const rules = [
    prefs.velocityEnabled,
    prefs.amountCheckEnabled,
    prefs.timeCheckEnabled,
    prefs.dailyLimitEnabled,
    prefs.balanceDrainEnabled,
    prefs.duplicateCheckEnabled,
    prefs.inactiveDaysEnabled,
  ]
  const active = rules.filter(Boolean).length
  const pct = Math.round((active / rules.length) * 100)

  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  const label = pct >= 70 ? 'Strong' : pct >= 40 ? 'Moderate' : 'Weak'
  const textColor = pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="card p-5 flex items-center gap-5">
      <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
        <ShieldCheck className="w-6 h-6 text-blue-400" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-white">Protection Level</p>
            <p className="text-xs text-gray-500">{active} of {rules.length} rules active</p>
          </div>
          <span className={clsx('text-sm font-bold', textColor)}>{label} ({pct}%)</span>
        </div>
        <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-500', color)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export const FraudRulesSettings: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [prefs, setPrefs] = useState<UserFraudPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }

    api.get('/preferences')
      .then(({ data }) => setPrefs(data as UserFraudPreferences))
      .catch(() => toast.error('Failed to load fraud settings'))
      .finally(() => setLoading(false))
  }, [user?.id, authLoading, navigate])

  const update = useCallback(<K extends keyof UserFraudPreferences>(key: K, value: UserFraudPreferences[K]) => {
    setPrefs(p => p ? { ...p, [key]: value } : p)
    setDirty(true)
  }, [])

  const save = async () => {
    if (!prefs || !user) return
    setSaving(true)
    try {
      const { data } = await api.patch('/preferences', {
        velocityEnabled: prefs.velocityEnabled,
        velocityMaxTxCount: prefs.velocityMaxTxCount,
        velocityWindowMinutes: prefs.velocityWindowMinutes,
        amountCheckEnabled: prefs.amountCheckEnabled,
        amountMultiplier: prefs.amountMultiplier,
        timeCheckEnabled: prefs.timeCheckEnabled,
        activeHoursStart: prefs.activeHoursStart,
        activeHoursEnd: prefs.activeHoursEnd,
        dailyLimitEnabled: prefs.dailyLimitEnabled,
        dailySpendLimit: prefs.dailySpendLimit,
        balanceDrainEnabled: prefs.balanceDrainEnabled,
        balanceDrainPercent: prefs.balanceDrainPercent,
        balanceDrainWindowMinutes: prefs.balanceDrainWindowMinutes,
        duplicateCheckEnabled: prefs.duplicateCheckEnabled,
        duplicateWindowMinutes: prefs.duplicateWindowMinutes,
        duplicateAmountThreshold: prefs.duplicateAmountThreshold,
        inactiveDaysEnabled: prefs.inactiveDaysEnabled,
        inactiveDays: prefs.inactiveDays,
      })
      setPrefs(data as UserFraudPreferences)
      setDirty(false)
      toast.success('Fraud rules saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const resetDefaults = () => {
    if (!prefs) return
    setPrefs({ ...prefs, ...DEFAULTS })
    setDirty(true)
    toast('Reset to default settings', { icon: '↩' })
  }

  const toggleDay = (day: number) => {
    if (!prefs) return
    const days = prefs.inactiveDays ?? []
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day]
    update('inactiveDays', next)
  }

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 bg-dark-800 rounded-lg animate-pulse" />
          <div className="h-20 rounded-2xl bg-dark-850 animate-pulse" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-dark-850 animate-pulse" />)}
        </div>
      </AppShell>
    )
  }

  if (!prefs) return null

  return (
    <AppShell>
      <div className="p-6 space-y-5 animate-fade-in max-w-2xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Fraud Detection Rules</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Customize how SecureBank monitors your transactions for suspicious activity.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={resetDefaults}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-800 border border-dark-700 text-gray-400 hover:text-white hover:border-dark-600 text-sm font-medium transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                dirty
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-dark-800 border border-dark-700 text-gray-500 cursor-not-allowed'
              )}
            >
              {saving
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                : <><Save className="w-3.5 h-3.5" />{dirty ? 'Save Changes' : 'Saved'}</>
              }
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/8 border border-blue-500/20">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-300/80">
            These rules run on every transaction. When a rule triggers, the transaction is flagged for review.
            Stricter settings offer more protection but may occasionally flag legitimate transactions.
          </p>
        </div>

        {/* Protection score */}
        <ProtectionScore prefs={prefs} />

        {/* ── Rule 1: Velocity ──────────────────────────────────────────────── */}
        <RuleCard
          title="Velocity Check"
          description="Flag bursts of transactions — too many payments in a short window."
          icon={Zap}
          iconColor="bg-blue-500/15 text-blue-400"
          enabled={prefs.velocityEnabled}
          onToggle={() => update('velocityEnabled', !prefs.velocityEnabled)}
          riskLevel="high"
        >
          <div className="space-y-5">
            <SliderField
              label="Maximum transactions allowed"
              value={prefs.velocityMaxTxCount}
              min={2}
              max={20}
              unit="transactions"
              onChange={v => update('velocityMaxTxCount', v)}
              hint={`Flag if more than ${prefs.velocityMaxTxCount} transactions happen in the time window below.`}
            />
            <SliderField
              label="Time window"
              value={prefs.velocityWindowMinutes}
              min={5}
              max={240}
              step={5}
              unit="min"
              onChange={v => update('velocityWindowMinutes', v)}
              hint={`Any ${prefs.velocityMaxTxCount}+ transactions within ${prefs.velocityWindowMinutes} minutes will trigger a review.`}
            />
          </div>
        </RuleCard>

        {/* ── Rule 2: Amount Check ──────────────────────────────────────────── */}
        <RuleCard
          title="Unusual Amount"
          description="Flag transactions that are unusually large compared to your spending history."
          icon={TrendingUp}
          iconColor="bg-purple-500/15 text-purple-400"
          enabled={prefs.amountCheckEnabled}
          onToggle={() => update('amountCheckEnabled', !prefs.amountCheckEnabled)}
          riskLevel="medium"
        >
          <SliderField
            label="Amount multiplier threshold"
            value={prefs.amountMultiplier}
            min={1.5}
            max={10}
            step={0.5}
            unit="×"
            onChange={v => update('amountMultiplier', v)}
            hint={`Flag any transaction that is ${prefs.amountMultiplier}× larger than your average spend.`}
          />
        </RuleCard>

        {/* ── Rule 3: Time-of-Day ───────────────────────────────────────────── */}
        <RuleCard
          title="After-Hours Transactions"
          description="Flag transactions that occur outside your normal active hours."
          icon={Clock}
          iconColor="bg-amber-500/15 text-amber-400"
          enabled={prefs.timeCheckEnabled}
          onToggle={() => update('timeCheckEnabled', !prefs.timeCheckEnabled)}
          riskLevel="low"
        >
          <div className="grid grid-cols-2 gap-4">
            <HourPicker
              label="Active hours start"
              value={prefs.activeHoursStart}
              onChange={v => update('activeHoursStart', v)}
            />
            <HourPicker
              label="Active hours end"
              value={prefs.activeHoursEnd}
              onChange={v => update('activeHoursEnd', v)}
            />
          </div>
          <p className="text-[11px] text-gray-600 mt-2">
            Transactions outside this window will be flagged for review.
          </p>
        </RuleCard>

        {/* ── Rule 4: Daily Spend Limit ─────────────────────────────────────── */}
        <RuleCard
          title="Daily Spend Limit"
          description="Automatically flag transactions once your total daily spend exceeds a threshold."
          icon={Wallet}
          iconColor="bg-emerald-500/15 text-emerald-400"
          enabled={prefs.dailyLimitEnabled}
          onToggle={() => update('dailyLimitEnabled', !prefs.dailyLimitEnabled)}
          riskLevel="medium"
        >
          <NumberField
            label="Daily spend limit"
            value={prefs.dailySpendLimit}
            min={100}
            prefix="R"
            onChange={v => update('dailySpendLimit', v)}
            hint="Any transaction that pushes your daily total past this amount will be flagged."
          />
        </RuleCard>

        {/* ── Rule 5: Balance Drain ─────────────────────────────────────────── */}
        <RuleCard
          title="Balance Drain Alert"
          description="Flag transactions that would drain a large portion of your balance quickly."
          icon={Droplets}
          iconColor="bg-red-500/15 text-red-400"
          enabled={prefs.balanceDrainEnabled}
          onToggle={() => update('balanceDrainEnabled', !prefs.balanceDrainEnabled)}
          riskLevel="high"
        >
          <div className="space-y-5">
            <SliderField
              label="Balance drain threshold"
              value={prefs.balanceDrainPercent}
              min={10}
              max={99}
              unit="%"
              onChange={v => update('balanceDrainPercent', v)}
              hint={`Flag if ${prefs.balanceDrainPercent}% or more of your balance is spent within the window below.`}
            />
            <SliderField
              label="Time window"
              value={prefs.balanceDrainWindowMinutes}
              min={5}
              max={120}
              step={5}
              unit="min"
              onChange={v => update('balanceDrainWindowMinutes', v)}
            />
          </div>
        </RuleCard>

        {/* ── Rule 6: Duplicate Transactions ───────────────────────────────── */}
        <RuleCard
          title="Duplicate Transaction Detection"
          description="Catch repeated charges of the same amount within a short timeframe."
          icon={Copy}
          iconColor="bg-cyan-500/15 text-cyan-400"
          enabled={prefs.duplicateCheckEnabled}
          onToggle={() => update('duplicateCheckEnabled', !prefs.duplicateCheckEnabled)}
          riskLevel="medium"
        >
          <div className="space-y-5">
            <SliderField
              label="Lookback window"
              value={prefs.duplicateWindowMinutes}
              min={1}
              max={60}
              unit="min"
              onChange={v => update('duplicateWindowMinutes', v)}
              hint={`Check for identical amounts within the last ${prefs.duplicateWindowMinutes} minutes.`}
            />
            <NumberField
              label="Amount tolerance (treat as duplicate if within)"
              value={prefs.duplicateAmountThreshold}
              min={0}
              prefix="R"
              onChange={v => update('duplicateAmountThreshold', v)}
              hint="Two transactions within this rand difference are treated as duplicates."
            />
          </div>
        </RuleCard>

        {/* ── Rule 7: Inactive Days ─────────────────────────────────────────── */}
        <RuleCard
          title="Inactive Day Detection"
          description="Flag transactions on days when you typically don't transact."
          icon={CalendarX}
          iconColor="bg-pink-500/15 text-pink-400"
          enabled={prefs.inactiveDaysEnabled}
          onToggle={() => update('inactiveDaysEnabled', !prefs.inactiveDaysEnabled)}
          riskLevel="low"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-3">
              Select your inactive days
            </label>
            <div className="flex gap-2 flex-wrap">
              {DAY_LABELS.map((day, i) => {
                const selected = (prefs.inactiveDays ?? []).includes(i)
                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(i)}
                    className={clsx(
                      'w-12 h-10 rounded-xl text-xs font-semibold border transition-all',
                      selected
                        ? 'bg-pink-500/20 border-pink-500/60 text-pink-400'
                        : 'bg-dark-800 border-dark-700 text-gray-500 hover:border-dark-600 hover:text-white'
                    )}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-gray-600 mt-3">
              {(prefs.inactiveDays?.length ?? 0) === 0
                ? 'No days selected — this rule will not trigger.'
                : `Transactions on ${(prefs.inactiveDays ?? []).map(d => DAY_LABELS[d]).join(', ')} will be flagged.`
              }
            </p>
          </div>
        </RuleCard>

        {/* Bottom save bar (sticky) */}
        {dirty && (
          <div className="sticky bottom-6 flex justify-end">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-dark-800 border border-dark-600 shadow-card-hover">
              <p className="text-sm text-gray-400">You have unsaved changes</p>
              <button onClick={resetDefaults} className="text-sm text-gray-500 hover:text-white font-medium transition-colors">
                Discard
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all"
              >
                {saving
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                  : <><Save className="w-3.5 h-3.5" />Save Changes</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
