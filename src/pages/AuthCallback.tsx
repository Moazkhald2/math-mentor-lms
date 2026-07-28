import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') navigate('/dashboard')
      else if (event === 'PASSWORD_RECOVERY') navigate('/reset-password')
    })
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <p className="text-text-muted">Completing authentication...</p>
    </div>
  )
}
