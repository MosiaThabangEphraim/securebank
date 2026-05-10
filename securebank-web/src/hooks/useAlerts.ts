import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import type { Alert } from '../types'
import toast from 'react-hot-toast'
import { playAlertSound } from '../lib/alertSound'

export const useAlerts = (userId?: string) => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const instanceId = useRef(Math.random().toString(36).slice(2, 8))

  useEffect(() => {
    if (!userId) return

    const loadAlerts = async () => {
      try {
        const { data } = await api.get('/alerts')
        const mapped = data as Alert[]
        setAlerts(mapped)
        setUnreadCount(mapped.filter(a => a.status === 'unread').length)
      } finally {
        setLoading(false)
      }
    }

    loadAlerts()

    // Keep Supabase realtime for live INSERT notifications
    const subscription = supabase
      .channel(`alerts:${userId}:${instanceId.current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>
          const newAlert: Alert = {
            id:             raw.id as string,
            userId:         raw.user_id as string,
            transactionId:  raw.transaction_id as string | undefined,
            fraudCaseId:    raw.fraud_case_id as string | undefined,
            alertType:      raw.alert_type as string,
            title:          raw.title as string,
            message:        raw.message as string,
            status:         raw.status as string,
            actionRequired: Boolean(raw.action_required),
            actionUrl:      raw.action_url as string | undefined,
            createdAt:      raw.created_at as string,
            readAt:         raw.read_at as string | undefined,
          }
          setAlerts(prev => [newAlert, ...prev])
          setUnreadCount(prev => prev + 1)
          playAlertSound()
          toast.success(newAlert.title)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [userId])

  const markAsRead = async (alertId: string) => {
    const now = new Date().toISOString()
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'read', readAt: now } : a))
    setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      const { data } = await api.patch(`/alerts/${alertId}/read`)
      setAlerts(prev => prev.map(a => a.id === alertId ? (data as Alert) : a))
    } catch (err) {
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'unread', readAt: undefined } : a))
      setUnreadCount(prev => prev + 1)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.patch('/alerts/read-all')
      const now = new Date().toISOString()
      setAlerts(prev => prev.map(a => ({ ...a, status: 'read', readAt: now })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all alerts as read:', err)
    }
  }

  return {
    alerts,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  }
}
