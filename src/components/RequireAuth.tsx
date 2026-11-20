import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface RequireAuthProps {
  children: ReactNode
}

/**
 * Route-level authentication gate.
 * Prevents unauthenticated visitors from rendering or triggering queries
 * on any LMS content route. Preserves the requested path via `?next=...`.
 */
export default function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-brand" />
          <p className="text-sm text-text-muted">Checking your session...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    const requestedPath = `${location.pathname}${location.search}`
    const nextParam = encodeURIComponent(requestedPath)
    return <Navigate to={`/login?next=${nextParam}`} replace />
  }

  return <>{children}</>
}
