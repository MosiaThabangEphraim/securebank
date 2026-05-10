import type { Account, Transaction, UserFraudPreferences } from '../types'
import { formatCurrency } from './utils'

export interface FraudReason {
  rule: string
  detail: string
  score: number
}

export interface FraudCheckResult {
  flagged: boolean
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reasons: FraudReason[]
}

export interface FraudCheckInput {
  amount: number
  beneficiaryId: string
  account: Account
  recentTransactions: Transaction[]
  prefs: UserFraudPreferences
}

const pad = (n: number) => String(n).padStart(2, '0')
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function checkFraud(input: FraudCheckInput): FraudCheckResult {
  const { amount, beneficiaryId, account, recentTransactions, prefs } = input
  const reasons: FraudReason[] = []
  let riskScore = 0

  const now = new Date()
  const currentHour = now.getHours()
  const currentDay = now.getDay()

  // ── 1. Velocity ──────────────────────────────────────────────────────────────
  if (prefs.velocityEnabled) {
    const windowStart = new Date(now.getTime() - prefs.velocityWindowMinutes * 60_000)
    const recentCount = recentTransactions.filter(t =>
      t.accountId === account.id &&
      t.direction === 'debit' &&
      new Date(t.initiatedAt) >= windowStart
    ).length
    if (recentCount >= prefs.velocityMaxTxCount) {
      riskScore += 30
      reasons.push({
        rule: 'Velocity Limit',
        detail: `${recentCount} payments sent in the last ${prefs.velocityWindowMinutes} min — your limit is ${prefs.velocityMaxTxCount}`,
        score: 30,
      })
    }
  }

  // ── 2. Unusual amount ─────────────────────────────────────────────────────────
  if (prefs.amountCheckEnabled) {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1_000)
    const pastDebits = recentTransactions.filter(t =>
      t.accountId === account.id &&
      t.direction === 'debit' &&
      t.status === 'posted' &&
      new Date(t.initiatedAt) >= ninetyDaysAgo
    )
    if (pastDebits.length >= 3) {
      const avg = pastDebits.reduce((s, t) => s + t.amount, 0) / pastDebits.length
      const multiple = amount / avg
      if (multiple > prefs.amountMultiplier) {
        riskScore += 25
        reasons.push({
          rule: 'Unusual Amount',
          detail: `${formatCurrency(amount)} is ${multiple.toFixed(1)}× your 90-day average of ${formatCurrency(avg)}`,
          score: 25,
        })
      }
    }
  }

  // ── 3. Time of day ────────────────────────────────────────────────────────────
  if (prefs.timeCheckEnabled) {
    const { activeHoursStart: s, activeHoursEnd: e } = prefs
    const outside = s <= e
      ? currentHour < s || currentHour >= e
      : currentHour >= e && currentHour < s
    if (outside) {
      riskScore += 20
      reasons.push({
        rule: 'Unusual Time',
        detail: `Transaction at ${pad(currentHour)}:00, outside your active hours (${pad(s)}:00–${pad(e)}:00)`,
        score: 20,
      })
    }
  }

  // ── 4. Daily spend limit ──────────────────────────────────────────────────────
  if (prefs.dailyLimitEnabled) {
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const todaySpend = recentTransactions
      .filter(t => t.accountId === account.id && t.direction === 'debit' && new Date(t.initiatedAt) >= startOfDay)
      .reduce((s, t) => s + t.amount, 0)
    if (todaySpend + amount > prefs.dailySpendLimit) {
      riskScore += 30
      reasons.push({
        rule: 'Daily Limit',
        detail: `Would bring today's spend to ${formatCurrency(todaySpend + amount)} — your limit is ${formatCurrency(prefs.dailySpendLimit)}`,
        score: 30,
      })
    }
  }

  // ── 5. Balance drain ──────────────────────────────────────────────────────────
  if (prefs.balanceDrainEnabled && account.balance > 0) {
    const drainWindowStart = new Date(now.getTime() - prefs.balanceDrainWindowMinutes * 60_000)
    const windowSpend = recentTransactions
      .filter(t => t.accountId === account.id && t.direction === 'debit' && new Date(t.initiatedAt) >= drainWindowStart)
      .reduce((s, t) => s + t.amount, 0)
    const drainPct = ((windowSpend + amount) / account.balance) * 100
    if (drainPct >= prefs.balanceDrainPercent) {
      riskScore += 40
      reasons.push({
        rule: 'Balance Drain',
        detail: `Would drain ${drainPct.toFixed(0)}% of your balance within ${prefs.balanceDrainWindowMinutes} min (threshold: ${prefs.balanceDrainPercent}%)`,
        score: 40,
      })
    }
  }

  // ── 6. Duplicate transaction ──────────────────────────────────────────────────
  if (prefs.duplicateCheckEnabled && amount >= prefs.duplicateAmountThreshold) {
    const dupWindowStart = new Date(now.getTime() - prefs.duplicateWindowMinutes * 60_000)
    const isDuplicate = recentTransactions.some(t =>
      t.accountId === account.id &&
      t.direction === 'debit' &&
      t.beneficiaryId === beneficiaryId &&
      Math.abs(t.amount - amount) < 0.01 &&
      new Date(t.initiatedAt) >= dupWindowStart
    )
    if (isDuplicate) {
      riskScore += 35
      reasons.push({
        rule: 'Duplicate Transaction',
        detail: `Same amount sent to the same recipient within the last ${prefs.duplicateWindowMinutes} min`,
        score: 35,
      })
    }
  }

  // ── 7. Inactive day ───────────────────────────────────────────────────────────
  if (prefs.inactiveDaysEnabled && prefs.inactiveDays?.includes(currentDay)) {
    riskScore += 25
    reasons.push({
      rule: 'Inactive Day',
      detail: `You typically don't transact on ${DAY_NAMES[currentDay]}s`,
      score: 25,
    })
  }

  const capped = Math.min(riskScore, 100)
  const riskLevel =
    capped <= 30 ? 'low' :
    capped <= 60 ? 'medium' :
    capped <= 80 ? 'high' : 'critical'

  return { flagged: reasons.length > 0, riskScore: capped, riskLevel, reasons }
}
