import { useState, useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mail, Send, Phone } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import ThemeToggle from './ThemeToggle'

// Owner fills these later (contact placeholders)
const CONTACT_WHATSAPP: string = '' // e.g. '+201000000000'
const CONTACT_TELEGRAM: string = 'https://t.me/themathmentor'
const CONTACT_EMAIL: string = 'support@themathmentor.com'

export default function Layout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
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

  function handleLogo() {
    navigate(user ? '/dashboard' : '/')
    setMenuOpen(false)
  }

  const navLink = 'text-base font-medium text-text-muted transition-colors duration-150 hover:text-brand'

  return (
    <div className="flex min-h-screen flex-col bg-primary text-primary">
      <header className="border-b border-border shadow-[inset_0_-2px_0_theme(colors.brand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-6">
            <button onClick={handleLogo} className="flex cursor-pointer items-center gap-2" aria-label="Go to dashboard">
              <img src="/logo-main.png" alt="The Math Mentor" className="h-9 w-auto rounded-lg p-0.5 transition-transform duration-150 hover:scale-105 dark:bg-white" />
            </button>
            <div className="hidden gap-6 md:flex">
              <a href="/questions" className={navLink}>Questions</a>
              <a href="/exams" className={navLink}>Exams</a>
              <a href="/dashboard" className={navLink}>Dashboard</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden items-center gap-3 md:flex">
              {loading ? null : user ? (
                <>
                  <a href="/profile" className="text-base font-semibold text-text-muted transition-colors duration-150 hover:text-brand">{user.user_metadata.full_name}</a>
                  <button onClick={signOut} className="btn btn-outline px-5 py-2.5 text-base font-semibold">Sign Out</button>
                </>
              ) : (
                <>
                  <a href="/login" className="btn btn-outline px-8 py-4 text-xl font-bold">Sign In</a>
                  <a href="/register" className="btn btn-primary hover-lift px-9 py-4 text-xl font-extrabold">Sign Up</a>
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
              <a href="/questions" className={navLink} onClick={() => setMenuOpen(false)}>Questions</a>
              <a href="/exams" className={navLink} onClick={() => setMenuOpen(false)}>Exams</a>
              <a href="/dashboard" className={navLink} onClick={() => setMenuOpen(false)}>Dashboard</a>
              {loading ? null : user ? (
                <>
                  <span className="text-sm text-muted">Signed in as {user.user_metadata.full_name}</span>
                  <button onClick={signOut} className="btn btn-outline">Sign Out</button>
                </>
              ) : (
                <>
                  <a href="/login" className="btn btn-outline w-full text-center" onClick={() => setMenuOpen(false)}>Sign In</a>
                  <a href="/register" className="btn btn-primary w-full text-center font-bold" onClick={() => setMenuOpen(false)}>Sign Up</a>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      <footer id="contact" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-text-muted md:px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row">
            <div>
              <p className="font-display text-base font-semibold text-ink">Contact</p>
              <ul className="mt-2 space-y-2">
                {CONTACT_WHATSAPP && (
                  <li>
                    <a href={`https://wa.me/${CONTACT_WHATSAPP.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-brand">
                      <Phone className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                      WhatsApp: {CONTACT_WHATSAPP}
                    </a>
                  </li>
                )}
                <li>
                  <a href={CONTACT_TELEGRAM} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-brand">
                    <Send className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    Telegram: @themathmentor
                  </a>
                </li>
                <li>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 transition-colors hover:text-brand">
                    <Mail className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    {CONTACT_EMAIL}
                  </a>
                </li>
              </ul>
            </div>
            <div className="flex items-end">
              <span>© {new Date().getFullYear()} The Math Mentor — Master Math with Confidence</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
