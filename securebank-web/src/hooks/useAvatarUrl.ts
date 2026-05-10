import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAvatarUrl(userId?: string): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('profile_picture_url')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setUrl((data?.profile_picture_url as string) ?? null)
      })
  }, [userId])

  return url
}
