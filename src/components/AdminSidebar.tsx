import { useLocation } from 'react-router-dom'

const links = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/classes', label: 'Classes', icon: '🏫' },
  { href: '/admin/questions', label: 'Questions', icon: '❓' },
  { href: '/admin/exams', label: 'Exams', icon: '📝' },
  { href: '/admin/attempts', label: 'Attempts', icon: '📋' },
  { href: '/admin/csv-import', label: 'CSV Import', icon: '📄' },
  { href: '/admin/csv-export', label: 'CSV Export', icon: '⬇️' },
  { href: '/admin/bulk-exams', label: 'Bulk Exams', icon: '🏗️' },
  { href: '/admin/references', label: 'References', icon: '📚' },
  { href: '/admin/grading', label: 'Grading', icon: '✏️' },
  { href: '/admin/violations', label: 'Violations', icon: '🚨' },
  { href: '/admin/question-analysis', label: 'Question Analysis', icon: '📈' },
]

export default function AdminSidebar() {
  const location = useLocation()

  return (
    <>
      <nav className="hidden w-56 shrink-0 md:block">
        <h2 className="mb-4 text-lg font-bold text-text">Admin Panel</h2>
        <div className="space-y-1">
          {links.map((link) => {
            const active = location.pathname === link.href
            return (
              <a
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand text-white'
                    : 'text-text-muted hover:bg-surface hover:text-text'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </a>
            )
          })}
        </div>
      </nav>
      <nav className="-mx-4 mb-6 overflow-x-auto px-4 md:hidden">
        <div className="flex gap-2">
          {links.map((link) => {
            const active = location.pathname === link.href
            return (
              <a
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand text-white'
                    : 'border border-border text-text-muted hover:border-brand hover:text-text'
                }`}
              >
                {link.label}
              </a>
            )
          })}
        </div>
      </nav>
    </>
  )
}
