import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM      = 'SecureBank Alerts <alerts@securebank.co.za>'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertRow {
  id: string
  user_id: string
  transaction_id?: string
  alert_type: string
  title: string
  message: string
  action_required: boolean
  action_url?: string
  created_at: string
}

interface TxRow {
  amount: number
  currency_code: string
  direction: string
  merchant_name?: string
  merchant_category?: string
  status: string
  reference_number?: string
  notes?: string
  initiated_at: string
}

interface FraudCaseRow {
  dispute_reason?: string
  dispute_description?: string
  sla_deadline?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatZAR(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

function parseFraudFlags(notes?: string): string[] {
  if (!notes) return []
  const match = notes.match(/Fraud flags?: (.+)/i)
  if (!match) return []
  return match[1].split(',').map(s => s.trim()).filter(Boolean)
}

// ─── Email builders ───────────────────────────────────────────────────────────

const COLORS = {
  transaction: { accent: '#10b981', label: 'Transaction',  icon: '✅' },
  review:      { accent: '#a855f7', label: 'Review',        icon: '🕐' },
  fraud:       { accent: '#ef4444', label: 'Fraud Alert',   icon: '🚨' },
  dispute:     { accent: '#f97316', label: 'Dispute',       icon: '⚠️'  },
  security:    { accent: '#f59e0b', label: 'Security',      icon: '🔒' },
  info:        { accent: '#3b82f6', label: 'Info',          icon: 'ℹ️'  },
}

function getColor(type: string) {
  return COLORS[type as keyof typeof COLORS] ?? COLORS.info
}

function base(title: string, accentColor: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr><td style="background:${accentColor};border-radius:12px 12px 0 0;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:.8">SecureBank</p>
          <p style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;line-height:1.3">${title}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e4e4e7;border-top:none">
          ${body}

          <!-- Footer -->
          <p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #f4f4f5;color:#9ca3af;font-size:11px;line-height:1.6;text-align:center">
            This is an automated notification from SecureBank.<br>
            If you did not initiate this action, please contact support immediately.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top">${label}</td>
    <td style="padding:10px 0;color:#111827;font-size:13px;font-weight:600;vertical-align:top">${value}</td>
  </tr>`
}

function detailsTable(rows: [string, string][]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse">
    ${rows.map(([l, v]) => row(l, v)).join('')}
  </table>`
}

function flagsBlock(flags: string[]): string {
  if (flags.length === 0) return ''
  const items = flags.map(f =>
    `<li style="margin:6px 0;color:#dc2626;font-size:13px">🚩 <strong>${f.replace(/_/g, ' ')}</strong></li>`
  ).join('')
  return `<div style="margin:20px 0;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px">
    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.5px">Fraud Flags Detected</p>
    <ul style="margin:0;padding-left:16px">${items}</ul>
  </div>`
}

function disputeBlock(fc: FraudCaseRow): string {
  if (!fc.dispute_description) return ''
  const lines = fc.dispute_description.split('\n').map(l =>
    `<li style="margin:6px 0;color:#374151;font-size:13px">${l}</li>`
  ).join('')
  return `<div style="margin:20px 0;padding:16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px">
    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#ea580c;text-transform:uppercase;letter-spacing:.5px">Fraud Case Details</p>
    <ul style="margin:0;padding-left:16px">${lines}</ul>
    ${fc.sla_deadline ? `<p style="margin:12px 0 0;font-size:12px;color:#9a3412">Case SLA deadline: <strong>${new Date(fc.sla_deadline).toLocaleDateString('en-ZA', { day:'numeric',month:'long',year:'numeric' })}</strong></p>` : ''}
  </div>`
}

function ctaButton(text: string, url: string, color: string): string {
  const appUrl = Deno.env.get('APP_URL') ?? 'https://securebank.co.za'
  return `<div style="text-align:center;margin:24px 0">
    <a href="${appUrl}${url}" style="display:inline-block;padding:12px 28px;background:${color};color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px">${text}</a>
  </div>`
}

// ─── Email builders per alert type ────────────────────────────────────────────

function buildTransactionEmail(alert: AlertRow, tx: TxRow | null) {
  const c = getColor(alert.alert_type)
  const isDebit = tx?.direction === 'debit'
  const details: [string, string][] = tx ? [
    ['Amount',    formatZAR(tx.amount)],
    ['Direction', isDebit ? 'Outgoing payment' : 'Incoming payment'],
    tx.merchant_name ? ['Recipient', tx.merchant_name] : ['', ''],
    tx.reference_number ? ['Reference', tx.reference_number] : ['', ''],
    ['Category', tx.merchant_category ?? 'Transfer'],
    ['Date', new Date(tx.initiated_at).toLocaleString('en-ZA', { dateStyle:'medium', timeStyle:'short' })],
  ].filter(([l]) => l !== '') : []

  const body = `
    <p style="margin:0 0 4px;color:#6b7280;font-size:13px">${c.icon} ${c.label}</p>
    <p style="margin:0 0 20px;color:#111827;font-size:15px">${alert.message}</p>
    ${details.length ? detailsTable(details) : ''}
  `
  return {
    subject: `${c.icon} ${alert.title} — SecureBank`,
    html: base(alert.title, c.accent, body),
  }
}

function buildReviewEmail(alert: AlertRow, tx: TxRow | null) {
  const c = getColor('review')
  const details: [string, string][] = tx ? [
    ['Amount', formatZAR(tx.amount)],
    tx.merchant_name ? ['To', tx.merchant_name] : ['', ''],
    tx.reference_number ? ['Reference', tx.reference_number] : ['', ''],
    ['Initiated', new Date(tx.initiated_at).toLocaleString('en-ZA', { dateStyle:'medium', timeStyle:'short' })],
  ].filter(([l]) => l !== '') : []

  const body = `
    <p style="margin:0 0 4px;color:#6b7280;font-size:13px">${c.icon} Action Required</p>
    <p style="margin:0 0 20px;color:#111827;font-size:15px">${alert.message}</p>
    ${details.length ? detailsTable(details) : ''}
    ${alert.action_url ? ctaButton('Go to Review Zone', alert.action_url, c.accent) : ''}
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0">Approve the transaction if you recognise it, or reject it to block the payment.</p>
  `
  return {
    subject: `${c.icon} Action Required: Transaction in Review — SecureBank`,
    html: base(alert.title, c.accent, body),
  }
}

function buildFraudEmail(alert: AlertRow, tx: TxRow | null, fc: FraudCaseRow | null) {
  const c = getColor(alert.alert_type)
  const flags = parseFraudFlags(tx?.notes)
  const details: [string, string][] = tx ? [
    ['Amount', formatZAR(tx.amount)],
    tx.merchant_name ? ['Intended recipient', tx.merchant_name] : ['', ''],
    tx.reference_number ? ['Reference', tx.reference_number] : ['', ''],
    ['Status', tx.status.toUpperCase()],
    ['Date', new Date(tx.initiated_at).toLocaleString('en-ZA', { dateStyle:'medium', timeStyle:'short' })],
  ].filter(([l]) => l !== '') : []

  const body = `
    <p style="margin:0 0 4px;color:#6b7280;font-size:13px">${c.icon} ${c.label}</p>
    <p style="margin:0 0 20px;color:#111827;font-size:15px">${alert.message}</p>
    ${details.length ? detailsTable(details) : ''}
    ${flagsBlock(flags)}
    ${fc ? disputeBlock(fc) : ''}
    ${alert.action_url ? ctaButton('View Dispute', alert.action_url, c.accent) : ''}
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0">If you did not initiate this transaction, please contact SecureBank support immediately.</p>
  `
  return {
    subject: `${c.icon} ${alert.title} — SecureBank`,
    html: base(alert.title, c.accent, body),
  }
}

function buildSecurityEmail(alert: AlertRow, tx: TxRow | null) {
  const c = getColor('security')
  const details: [string, string][] = tx ? [
    ['Amount', formatZAR(tx.amount)],
    tx.merchant_name ? ['Recipient', tx.merchant_name] : ['', ''],
    tx.reference_number ? ['Reference', tx.reference_number] : ['', ''],
    ['Date', new Date(tx.initiated_at).toLocaleString('en-ZA', { dateStyle:'medium', timeStyle:'short' })],
  ].filter(([l]) => l !== '') : []

  const body = `
    <p style="margin:0 0 4px;color:#6b7280;font-size:13px">${c.icon} Security Notice</p>
    <p style="margin:0 0 20px;color:#111827;font-size:15px">${alert.message}</p>
    ${details.length ? detailsTable(details) : ''}
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0">No funds were transferred. If you did not request this, no action is needed.</p>
  `
  return {
    subject: `${c.icon} ${alert.title} — SecureBank`,
    html: base(alert.title, c.accent, body),
  }
}

function buildEmail(
  alert: AlertRow,
  tx: TxRow | null,
  fc: FraudCaseRow | null,
): { subject: string; html: string } {
  switch (alert.alert_type) {
    case 'transaction': return buildTransactionEmail(alert, tx)
    case 'review':      return buildReviewEmail(alert, tx)
    case 'fraud':
    case 'dispute':     return buildFraudEmail(alert, tx, fc)
    case 'security':    return buildSecurityEmail(alert, tx)
    default:            return buildTransactionEmail(alert, tx)
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const alert: AlertRow = payload.record

    if (!alert?.user_id || !alert?.alert_type) {
      return new Response('Invalid payload', { status: 400 })
    }

    // Get user email via service role
    const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(alert.user_id)
    if (userErr || !user?.email) {
      console.error('Could not resolve user email:', userErr)
      return new Response('User not found', { status: 200 }) // 200 so webhook doesn't retry
    }

    // Fetch transaction details
    let tx: TxRow | null = null
    if (alert.transaction_id) {
      const { data } = await supabase
        .from('transactions')
        .select('amount,currency_code,direction,merchant_name,merchant_category,status,reference_number,notes,initiated_at')
        .eq('id', alert.transaction_id)
        .single()
      tx = data as TxRow | null
    }

    // Fetch fraud case for dispute alerts
    let fc: FraudCaseRow | null = null
    if ((alert.alert_type === 'dispute' || alert.alert_type === 'fraud') && alert.transaction_id) {
      const { data } = await supabase
        .from('fraud_cases')
        .select('dispute_reason,dispute_description,sla_deadline')
        .eq('transaction_id', alert.transaction_id)
        .maybeSingle()
      fc = data as FraudCaseRow | null
    }

    const { subject, html } = buildEmail(alert, tx, fc)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [user.email], subject, html }),
    })

    const resBody = await res.json()
    if (!res.ok) {
      console.error('Resend error:', resBody)
      return new Response(JSON.stringify(resBody), { status: 500 })
    }

    console.log(`Email sent to ${user.email} — alert ${alert.id}`)
    return new Response(JSON.stringify({ ok: true }), { status: 200 })

  } catch (err) {
    console.error('send-alert-email error:', err)
    return new Response(String(err), { status: 500 })
  }
})
