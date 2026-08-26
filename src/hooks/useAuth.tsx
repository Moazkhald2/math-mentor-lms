import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

const IDLE_TIMEOUT = 60 * 60 * 1000

const LOGIN_COOLDOWN_KEY = 'math_mentor_login_cooldown'
const MAX_ATTEMPTS = 5
const COOLDOWN_DURATION = 60 * 1000

interface AuthContextType {
  user: User | null
  loading: boolean
  loginCooldown: number
  signIn: (email: string, password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string, fullName: string, grade?: number, parentPhone?: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginCooldown: 0,
  signIn: async () => null,
  signInWithGoogle: async () => {},
  signUp: async () => null,
  signOut: async () => {},
})

async function ensureProfile(user: User) {
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (data) return data
  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    role: 'student',
  })
  if (error) console.error('Failed to auto-create profile', error)
  return null
}

const LAST_ACTIVITY_KEY = 'math_mentor_last_activity'

function updateLastActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
}

function getLoginCooldown(): number {
  const raw = localStorage.getItem(LOGIN_COOLDOWN_KEY)
  if (!raw) return 0
  const remaining = parseInt(raw, 10) - Date.now()
  return remaining > 0 ? remaining : 0
}

function setLoginCooldown() {
  localStorage.setItem(LOGIN_COOLDOWN_KEY, String(Date.now() + COOLDOWN_DURATION))
}

function incrementAttempts(): number {
  const key = 'math_mentor_login_attempts'
  const now = Date.now()
  const stored = localStorage.getItem(key)
  let attempts: { count: number; window: number } = stored
    ? JSON.parse(stored)
    : { count: 0, window: now }
  if (now - attempts.window > COOLDOWN_DURATION) {
    attempts = { count: 1, window: now }
  } else {
    attempts.count++
  }
  localStorage.setItem(key, JSON.stringify(attempts))
  return attempts.count
}

function resetAttempts() {
  localStorage.removeItem('math_mentor_login_attempts')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginCooldown, setLoginCooldownState] = useState(getLoginCooldown)

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    const handleActivity = () => updateLastActivity()
    events.forEach((e) => document.addEventListener(e, handleActivity))

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) await ensureProfile(currentUser)
      updateLastActivity()
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser && event === 'SIGNED_IN') {
        await ensureProfile(currentUser)
        resetAttempts()
      }
    })

    const idleInterval = setInterval(() => {
      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY)
      if (lastActivity && Date.now() - parseInt(lastActivity, 10) > IDLE_TIMEOUT) {
        supabase.auth.signOut()
        localStorage.removeItem(LAST_ACTIVITY_KEY)
        setUser(null)
      }
    }, 30000)

    const cooldownInterval = setInterval(() => {
      setLoginCooldownState(getLoginCooldown())
    }, 1000)

    return () => {
      events.forEach((e) => document.removeEventListener(e, handleActivity))
      subscription.unsubscribe()
      clearInterval(idleInterval)
      clearInterval(cooldownInterval)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const cooldown = getLoginCooldown()
    if (cooldown > 0) return `Too many attempts. Try again in ${Math.ceil(cooldown / 1000)} seconds.`

    const attempts = incrementAttempts()
    if (attempts > MAX_ATTEMPTS) {
      setLoginCooldown()
      setLoginCooldownState(COOLDOWN_DURATION)
      return `Too many attempts. Try again in 60 seconds.`
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  const signUp = async (email: string, password: string, fullName: string, grade?: number, parentPhone?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, grade, parent_phone: parentPhone ?? '' } },
    })
    return error?.message ?? null
  }

  const signOut = async () => {
    localStorage.removeItem(LAST_ACTIVITY_KEY)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginCooldown, signIn, signInWithGoogle, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
