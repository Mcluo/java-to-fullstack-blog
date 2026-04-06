'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface User {
  name: string
  avatar: string
  githubId: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGitHub: () => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGitHub: async () => {},
  signOut: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata
        setUser({
          name: meta.user_name || meta.name || 'User',
          avatar: meta.avatar_url || '',
          githubId: meta.provider_id || session.user.id,
        })
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata
        setUser({
          name: meta.user_name || meta.name || 'User',
          avatar: meta.avatar_url || '',
          githubId: meta.provider_id || session.user.id,
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGitHub = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.href },
    })
  }, [])

  const signOut = useCallback(() => {
    if (!supabase) return
    supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGitHub, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
