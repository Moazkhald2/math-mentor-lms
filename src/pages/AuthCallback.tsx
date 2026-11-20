import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getPendingGroupInvite } from '../lib/groups'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        const pendingInvite = getPendingGroupInvite()
        navigate(pendingInvite ? `/join/${encodeURIComponent(pendingInvite)}` : '/dashboard', { replace: true })
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true })
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <p className="text-text-muted">Completing authentication...</p>
    </div>
  )
}
