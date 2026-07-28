import { useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Layout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border shadow-[inset_0_-2px_0_#1982C4]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-6">
            <a href="/" className="text-xl font-black text-brand">
              Math Mentor
            </a>
            <div className="hidden gap-6 md:flex">
              <a href="/questions" className="text-sm text-text-muted hover:text-text">Questions</a>
              <a href="/exams" className="text-sm text-text-muted hover:text-text">Exams</a>
              <a href="/dashboard" className="text-sm text-text-muted hover:text-text">Dashboard</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-4 md:flex">
              {loading ? null : user ? (
                <>
                  <span className="text-sm text-text-muted">{user.user_metadata.full_name}</span>
                  <button
                    onClick={signOut}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <a href="/login" className="text-sm text-text-muted hover:text-text">Login</a>
                  <a href="/register" className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-light">Sign Up</a>
                </>
              )}
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center p-2 text-text-muted md:hidden"
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
          <div className="border-t border-border bg-surface px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="/questions" className="text-sm text-text-muted hover:text-text" onClick={() => setMenuOpen(false)}>Questions</a>
              <a href="/exams" className="text-sm text-text-muted hover:text-text" onClick={() => setMenuOpen(false)}>Exams</a>
              <a href="/dashboard" className="text-sm text-text-muted hover:text-text" onClick={() => setMenuOpen(false)}>Dashboard</a>
              {loading ? null : user ? (
                <>
                  <span className="text-sm text-text-muted">Signed in as {user.user_metadata.full_name}</span>
                  <button onClick={signOut} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:text-text">Sign Out</button>
                </>
              ) : (
                <>
                  <a href="/login" className="text-sm text-text-muted hover:text-text" onClick={() => setMenuOpen(false)}>Login</a>
                  <a href="/register" className="rounded-lg bg-brand px-4 py-2 text-sm text-white text-center hover:bg-brand-light" onClick={() => setMenuOpen(false)}>Sign Up</a>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  )
}
