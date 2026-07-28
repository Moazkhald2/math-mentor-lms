import { useLocation } from 'react-router-dom'

const links = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/classes', label: 'Classes', icon: '🏫' },
  { href: '/admin/questions', label: 'Questions', icon: '❓' },
  { href: '/admin/exams', label: 'Exams', icon: '📝' },
  { href: '/admin/attempts', label: 'Attempts', icon: '📋' },
]

export default function AdminSidebar() {
  const location = useLocation()

  return (
    <nav className="w-56 shrink-0">
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
  )
}
