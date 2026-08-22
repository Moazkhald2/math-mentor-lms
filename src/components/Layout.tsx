import { useState, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function Layout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    const skip = location.pathname === '/complete-profile' || location.pathname.startsWith('/admin')
    if (skip) return
    supabase.from('profiles').select('grade').eq('id', user.id).single()
      .then(({ data }) => {
        if (data && !data.grade) {
          window.location.href = '/complete-profile'
        }
      })
  }, [user, loading, location.pathname])

  const instaUrl = import.meta.env.VITE_INSTAGRAM_URL ?? 'https://instagram.com/themathmentor'

  return (
    <div className="flex min-h-screen flex-col bg-primary text-primary">
      <header className="border-b border-border shadow-[inset_0_-2px_0_theme(colors.brand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo-main.png" alt="The Math Mentor" className="h-8 w-auto" />
            </a>
            <div className="hidden gap-6 md:flex">
              <a href="/questions" className="text-sm text-muted hover:text-primary">Questions</a>
              <a href="/exams" className="text-sm text-muted hover:text-primary">Exams</a>
              <a href="/dashboard" className="text-sm text-muted hover:text-primary">Dashboard</a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={instaUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hidden md:inline-flex rounded-full border border-border p-2 text-text-muted hover:border-brand hover:text-brand"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <div className="hidden items-center gap-4 md:flex">
              {loading ? null : user ? (
                <>
                  <a href="/profile" className="text-sm text-muted hover:text-primary">{user.user_metadata.full_name}</a>
                  <button
                    onClick={signOut}
                    className="btn btn-outline"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <a href="/login" className="text-sm text-muted hover:text-primary">Login</a>
                  <a href="/register" className="btn btn-primary">Sign Up</a>
                </>
              )}
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center p-2 text-muted md:hidden"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-secondary px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="/questions" className="text-sm text-muted hover:text-primary" onClick={() => setMenuOpen(false)}>Questions</a>
              <a href="/exams" className="text-sm text-muted hover:text-primary" onClick={() => setMenuOpen(false)}>Exams</a>
              <a href="/dashboard" className="text-sm text-muted hover:text-primary" onClick={() => setMenuOpen(false)}>Dashboard</a>
              {loading ? null : user ? (
                <>
                  <span className="text-sm text-muted">Signed in as {user.user_metadata.full_name}</span>
                  <button onClick={signOut} className="btn btn-outline">Sign Out</button>
                </>
              ) : (
                <>
                  <a href="/login" className="text-sm text-muted hover:text-primary" onClick={() => setMenuOpen(false)}>Login</a>
                  <a href="/register" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Sign Up</a>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-text-muted md:flex-row md:px-6">
          <span>© {new Date().getFullYear()} The Math Mentor — Master Math with Confidence</span>
          <div className="flex items-center gap-4">
            <a href={instaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none" />
              </svg>
              Instagram
            </a>
            <a href="/exams" className="hover:text-brand">Exams</a>
            <a href="/dashboard" className="hover:text-brand">Dashboard</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
