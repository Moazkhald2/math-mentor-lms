import { type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Layout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border px-6 py-4 shadow-[inset_0_-2px_0_#1982C4]">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="text-xl font-black text-brand">
              Math Mentor
            </a>
            <a href="/questions" className="text-sm text-text-muted hover:text-text">
              Questions
            </a>
          </div>
          <div className="flex items-center gap-4">
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
                <a href="/login" className="text-sm text-text-muted hover:text-text">
                  Login
                </a>
                <a
                  href="/register"
                  className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-light"
                >
                  Sign Up
                </a>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}