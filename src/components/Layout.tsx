import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Send, Phone } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import ThemeToggle from './ThemeToggle'
import { LEGAL_CONTACT_EMAIL } from '../lib/legal'
import { applyGradeThemeToDocument } from '../lib/gradeTheme'

// Owner fills these later (contact placeholders)
const CONTACT_WHATSAPP: string = '' // e.g. '+201000000000'
const CONTACT_TELEGRAM: string = 'https://t.me/themathmentor'
const CONTACT_EMAIL: string = LEGAL_CONTACT_EMAIL

export default function Layout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const checkedGradeUserRef = useRef<string | null>(null)

  // Check once per signed-in user instead of re-querying Supabase on every route switch
  useEffect(() => {
    if (loading) return
    if (!user) {
      checkedGradeUserRef.current = null
      return
    }
    const skip =
      location.pathname === '/complete-profile' ||
      location.pathname.startsWith('/admin') ||
      location.pathname.startsWith('/join/') ||
      location.pathname === '/privacy' ||
      location.pathname === '/terms'
    if (skip || checkedGradeUserRef.current === user.id) return
    checkedGradeUserRef.current = user.id
    supabase.from('profiles').select('grade').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.grade) {
          applyGradeThemeToDocument(data.grade)
        } else if (data && !data.grade) {
          navigate('/complete-profile', { replace: true })
        }
      })
  }, [user, loading, location.pathname, navigate])

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
            <button onClick={handleLogo} className="flex cursor-pointer items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label="Go to dashboard">
              <img src="/logo-main.png" alt="The Math Mentor" className="h-10 w-auto transition-transform duration-150 hover:scale-[1.02] dark:invert" />
            </button>
            {!loading && user && (
              <div className="hidden gap-6 md:flex">
                <Link to="/sheets" className={navLink}>Sheets</Link>
                <Link to="/exams" className={navLink}>Exams</Link>
                <Link to="/schedule" className={navLink}>Schedule</Link>
                <Link to="/dashboard" className={navLink}>Dashboard</Link>
                <Link to="/grapher" className={navLink}>Grapher</Link>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden items-center gap-3 md:flex">
              {loading ? null : user ? (
                <>
                  <Link
                    to="/profile"
                    className="flex flex-col items-end leading-tight text-right transition-colors duration-150 hover:text-brand"
                  >
                    <span className="text-sm font-bold text-ink">
                      {user.user_metadata?.full_name || 'Complete Name'}
                    </span>
                    {user.email && (
                      <span className="text-[11px] text-text-muted">Email: {user.email}</span>
                    )}
                  </Link>
                  <button onClick={signOut} className="btn btn-outline px-5 py-2.5 text-base font-bold">Sign Out</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-outline px-6 py-3 text-lg font-semibold">Sign In</Link>
                  <Link to="/register" className="btn btn-primary hover-lift px-7 py-3 text-lg font-extrabold">Sign Up</Link>
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
              {loading ? null : user ? (
                <>
                  <Link to="/sheets" className={navLink} onClick={() => setMenuOpen(false)}>Sheets</Link>
                  <Link to="/exams" className={navLink} onClick={() => setMenuOpen(false)}>Exams</Link>
                  <Link to="/schedule" className={navLink} onClick={() => setMenuOpen(false)}>Schedule</Link>
                  <Link to="/dashboard" className={navLink} onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  <Link to="/grapher" className={navLink} onClick={() => setMenuOpen(false)}>Grapher</Link>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                    <span className="block font-bold text-ink">Name: {user.user_metadata?.full_name || 'Not set'}</span>
                    {user.email && <span className="block text-xs text-text-muted">Email: {user.email}</span>}
                  </Link>
                  <button onClick={signOut} className="btn btn-outline">Sign Out</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-outline w-full text-center" onClick={() => setMenuOpen(false)}>Sign In</Link>
                  <Link to="/register" className="btn btn-primary w-full text-center font-bold" onClick={() => setMenuOpen(false)}>Sign Up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div key={location.pathname} className="animate-slide-up">
          {children}
        </div>
      </main>
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
            <div className="flex flex-col items-start justify-end gap-2 md:items-end">
              <p className="font-display text-sm italic text-brand">The Lesson Counts.</p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <Link to="/privacy" className="text-text-muted transition-colors hover:text-brand">
                  Privacy Notice · إشعار الخصوصية
                </Link>
                <Link to="/terms" className="text-text-muted transition-colors hover:text-brand">
                  Terms · شروط الاستخدام
                </Link>
              </div>
              <span>&copy; {new Date().getFullYear()} Moaaz Khaled &mdash; The Math Mentor. All Rights Reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
