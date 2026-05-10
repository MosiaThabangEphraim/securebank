import { api } from './api'

interface AlertPayload {
  userId?: string
  alertType: 'fraud' | 'review' | 'transaction' | 'dispute' | 'security' | 'info'
  title: string
  message: string
  transactionId?: string
  fraudCaseId?: string
  actionRequired?: boolean
  actionUrl?: string
}

export async function createAlert(p: AlertPayload): Promise<void> {
  await api.post('/alerts', {
    transactionId:  p.transactionId  ?? null,
    fraudCaseId:    p.fraudCaseId    ?? null,
    alertType:      p.alertType,
    title:          p.title,
    message:        p.message,
    actionRequired: p.actionRequired ?? false,
    actionUrl:      p.actionUrl      ?? null,
  })
}
