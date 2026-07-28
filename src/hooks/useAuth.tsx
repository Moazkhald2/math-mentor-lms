import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => null,
  signInWithGoogle: async () => {},
  signUp: async () => null,
  signOut: async () => {},
})

async function getProfileRole(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('role, session_token')
    .eq('id', userId)
    .single()
  return data as { role: string; session_token: string } | null
}

async function updateSessionToken(userId: string, token: string) {
  await supabase.from('profiles').update({ session_token: token }).eq('id', userId)
}

const SESSION_KEY = 'math_mentor_session_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const validateSession = async (currentUser: User) => {
    const profile = await getProfileRole(currentUser.id)
    if (!profile) return

    const storedToken = localStorage.getItem(SESSION_KEY)

    if (profile.role === 'admin') return

    if (profile.session_token && storedToken && profile.session_token !== storedToken) {
      await supabase.auth.signOut()
      localStorage.removeItem(SESSION_KEY)
      setUser(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const storedToken = localStorage.getItem(SESSION_KEY)
        if (!storedToken) {
          const newToken = crypto.randomUUID()
          localStorage.setItem(SESSION_KEY, newToken)
          await updateSessionToken(currentUser.id, newToken)
        } else {
          await validateSession(currentUser)
        }
      }

      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser && event === 'SIGNED_IN') {
        const newToken = crypto.randomUUID()
        localStorage.setItem(SESSION_KEY, newToken)
        await updateSessionToken(currentUser.id, newToken)
      }

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(SESSION_KEY)
      }
    })

    checkInterval.current = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) await validateSession(session.user)
    }, 30000)

    return () => {
      subscription.unsubscribe()
      if (checkInterval.current) clearInterval(checkInterval.current)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.session) {
      const newToken = crypto.randomUUID()
      localStorage.setItem(SESSION_KEY, newToken)
      await updateSessionToken(data.user.id, newToken)
    }
    return error?.message ?? null
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return error?.message ?? null
  }

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithGoogle, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
