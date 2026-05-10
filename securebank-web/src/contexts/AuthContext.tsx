import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

// ─── Profile helpers ──────────────────────────────────────────────────────────

function fallbackProfile(authUser: User): Profile {
  const meta = authUser.user_metadata ?? {}
  return {
    id:               authUser.id,
    email:            authUser.email ?? '',
    fullName:         (meta.full_name as string) || (authUser.email ?? '').split('@')[0],
    phoneNumber:      meta.phone_number as string | undefined,
    nationalId:       meta.national_id  as string | undefined,
    dateOfBirth:      meta.date_of_birth as string | undefined,
    address:          meta.address       as string | undefined,
    city:             meta.city          as string | undefined,
    countryCode:      (meta.country_code as string) || 'ZA',
    isLocked:         false,
    failedLoginCount: 0,
    createdAt:        authUser.created_at ?? new Date().toISOString(),
    updatedAt:        new Date().toISOString(),
  }
}

async function fetchProfileFromDb(authUser: User): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error) {
    console.warn('[AuthContext] DB profile fetch failed:', error.message, '— using auth metadata')
    return fallbackProfile(authUser)
  }

  const row = data as Record<string, unknown>
  return {
    id:                row.id as string,
    email:             authUser.email ?? '',
    fullName:          (row.full_name as string) || (authUser.email ?? '').split('@')[0],
    phoneNumber:       row.phone_number as string | undefined,
    nationalId:        row.national_id  as string | undefined,
    dateOfBirth:       row.date_of_birth as string | undefined,
    address:           row.address       as string | undefined,
    city:              row.city          as string | undefined,
    countryCode:       (row.country_code as string) || 'ZA',
    profilePictureUrl: row.profile_picture_url as string | undefined,
    isLocked:          (row.is_locked as boolean) ?? false,
    failedLoginCount:  (row.failed_login_count as number) ?? 0,
    lastLoginAt:       row.last_login_at as string | undefined,
    createdAt:         row.created_at as string,
    updatedAt:         row.updated_at as string,
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: Profile | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider — runs once for the entire app ──────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (session?.user) {
          // Unblock the UI immediately with auth metadata — no DB wait
          setUser(fallbackProfile(session.user))
          setLoading(false)
          // Enrich with real DB profile in the background
          fetchProfileFromDb(session.user).then(setUser).catch(() => {})
        } else {
          setLoading(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth error')
        setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password'
        return
      }
      if (session?.user) {
        setUser(fallbackProfile(session.user))
        setLoading(false)
        fetchProfileFromDb(session.user).then(setUser).catch(() => {})
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => { subscription.unsubscribe() }
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook — just reads from context, no side effects ─────────────────────────

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
