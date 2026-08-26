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
      className={`inline-flex items-center justify-center rounded-full border border-border p-2 text-text-muted transition-colors duration-150 hover:border-brand hover:text-brand ${className}`}
    >
      {theme === 'dark'
        ? <Sun className="h-4 w-4" aria-hidden="true" />
        : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  )
}
