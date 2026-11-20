import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  href: string
  label: string
  icon: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview & Schedule',
    items: [
      { href: '/admin', label: 'Dashboard', icon: '📊' },
      { href: '/admin/schedule', label: 'Schedule', icon: '📅' },
    ],
  },
  {
    title: 'Grades, Groups & Students',
    items: [
      { href: '/admin/classes', label: 'Grades & Groups', icon: '🏫' },
      { href: '/admin/users', label: 'Users', icon: '👥' },
    ],
  },
  {
    title: 'Content & Assessments',
    items: [
      { href: '/admin/exams', label: 'Exams', icon: '📝' },
      { href: '/admin/questions', label: 'Questions', icon: '❓' },
      { href: '/admin/bulk-exams', label: 'Bulk Exams', icon: '🏗️' },
      { href: '/admin/csv-import', label: 'CSV Import', icon: '📄' },
      { href: '/admin/csv-export', label: 'CSV Export', icon: '⬇️' },
    ],
  },
  {
    title: 'Analytics & Safety',
    items: [
      { href: '/admin/attempts', label: 'Attempts', icon: '📋' },
      { href: '/admin/grading', label: 'Grading', icon: '✏️' },
      { href: '/admin/question-analysis', label: 'Question Analysis', icon: '📈' },
      { href: '/admin/violations', label: 'Violations', icon: '🚨' },
    ],
  },
]

const ALL_ITEMS = ADMIN_NAV_SECTIONS.flatMap((s) => s.items)

export default function AdminSidebar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeItem = ALL_ITEMS.find((item) => item.href === location.pathname) ?? ALL_ITEMS[0]

  return (
    <>
      {/* Desktop Sidebar */}
      <nav aria-label="Admin navigation" className="hidden w-60 shrink-0 md:block">
        <h2 className="mb-4 text-lg font-bold text-primary">Admin Panel</h2>
        <div className="space-y-4">
          {ADMIN_NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-text-muted/80">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((link) => {
                  const active = location.pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={`nav-link ${
                        active
                          ? 'bg-brand text-brand-foreground'
                          : 'text-muted hover:bg-secondary hover:text-primary'
                      }`}
                    >
                      <span aria-hidden="true">{link.icon}</span>
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Mobile Collapsible Drawer Navigation */}
      <nav aria-label="Mobile admin navigation" className="mb-2 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold text-ink shadow-xs"
        >
          <span className="flex items-center gap-2">
            <span aria-hidden="true">{activeItem.icon}</span>
            <span>Admin · {activeItem.label}</span>
          </span>
          <span className="text-xs font-semibold text-brand">
            {mobileOpen ? 'Close ▲' : 'Menu ▼'}
          </span>
        </button>

        {mobileOpen && (
          <div className="mt-2 space-y-3 rounded-xl border border-border bg-surface p-3 shadow-md">
            {ADMIN_NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-text-muted/80">
                  {section.title}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {section.items.map((link) => {
                    const active = location.pathname === link.href
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-brand text-brand-foreground'
                            : 'border border-border text-muted hover:border-brand hover:text-primary'
                        }`}
                      >
                        <span aria-hidden="true">{link.icon}</span>
                        <span className="truncate">{link.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>
    </>
  )
}
