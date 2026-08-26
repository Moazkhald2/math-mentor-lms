import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const KEY = 'tmm-theme'

export function getStoredTheme(): 'light' | 'dark' {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark' || v === 'light') return v
  } catch { /* private mode */ }
  return 'light'
}

export function applyTheme(t: 'light' | 'dark') {
  document.documentElement.dataset.theme = t
  try { localStorage.setItem(KEY, t) } catch { /* ignore */ }
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-full border border-border bg-surface text-ink shadow-sm transition-all duration-300 hover:border-brand hover:text-brand dark:text-white ${className}`}
    >
      <span
        className="inline-flex transition-transform duration-500 ease-out"
        style={{ transform: theme === 'dark' ? 'rotate(-180deg) scale(1.05)' : 'rotate(0deg) scale(1)' }}
      >
        {theme === 'dark'
          ? <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
          : <Moon className="h-[18px] w-[18px]" aria-hidden="true" />}
      </span>
    </button>
  )
}
