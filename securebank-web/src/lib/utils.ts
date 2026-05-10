import { formatDistance, format } from 'date-fns'

export const formatCurrency = (amount: number, currency = 'ZAR'): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
  }).format(amount)
}

export const formatDate = (date: string | Date, formatStr = 'MMM dd, yyyy'): string => {
  return format(new Date(date), formatStr)
}

export const formatRelativeTime = (date: string | Date): string => {
  return formatDistance(new Date(date), new Date(), { addSuffix: true })
}

export const getRiskColor = (riskScore: number): string => {
  if (riskScore <= 30) return 'text-green-400 bg-green-900/20'
  if (riskScore <= 60) return 'text-yellow-400 bg-yellow-900/20'
  if (riskScore <= 80) return 'text-orange-400 bg-orange-900/20'
  return 'text-red-400 bg-red-900/20'
}

export const getRiskBadgeColor = (riskScore: number): string => {
  if (riskScore <= 30) return 'bg-green-900/40 text-green-400 border-green-700'
  if (riskScore <= 60) return 'bg-yellow-900/40 text-yellow-400 border-yellow-700'
  if (riskScore <= 80) return 'bg-orange-900/40 text-orange-400 border-orange-700'
  return 'bg-red-900/40 text-red-400 border-red-700'
}

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'posted':
    case 'active':
      return 'text-green-400 bg-green-900/20'
    case 'pending':
      return 'text-blue-400 bg-blue-900/20'
    case 'blocked':
    case 'cancelled':
    case 'closed':
      return 'text-red-400 bg-red-900/20'
    default:
      return 'text-gray-400 bg-gray-900/20'
  }
}

export const maskAccountNumber = (accountNumber: string, visibleChars = 4): string => {
  const length = accountNumber.length
  const hidden = Math.max(0, length - visibleChars)
  return '*'.repeat(hidden) + accountNumber.slice(-visibleChars)
}

export const maskCardNumber = (cardNumber: string): string => {
  return '**** **** **** ' + cardNumber.slice(-4)
}

export const generateReference = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
