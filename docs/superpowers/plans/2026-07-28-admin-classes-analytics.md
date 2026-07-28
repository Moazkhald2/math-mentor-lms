# Admin + Classes + Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full teacher/admin layer with class system, content management, practice mode, analytics, and settings.

**Architecture:** Single-page admin with sub-route sections under `/admin/`, class system as new Supabase tables, practice mode reuses exam flow with conditional behavior, KaTeX for LaTeX rendering.

**Tech Stack:** React 19, Vite 8, Tailwind v4, React Router, TanStack Query, Supabase, Recharts, KaTeX (all installed)

## Global Constraints

- TypeScript strict mode, `verbatimModuleSyntax` enabled → use `import type` for type-only imports
- Tailwind v4 custom theme: brand #1982C4, ink #222C31, accent-green #00784A, accent-gold #E8BB1A
- React 19 + React Router v7
- All admin pages require `role = 'admin'` check; redirect to `/` if not admin
- Practice sheets share `exams` table with `type` column (`'exam' | 'practice'`)
- Grade filter: integer 3-12 on both profiles and classes
- KaTeX CSS imported once in `index.html` or `index.css`
- Recharts already in dependencies

---

### Task 1: Database Migrations

**Files:**
- Modify: `supabase/schema.sql`
- Create: `supabase/migrate-2026-07-28.sql`

**Interfaces:**
- Consumes: existing schema
- Produces: classes, class_members, activity_logs tables; grade column on profiles; type column on exams

- [ ] **Step 1: Write migration script**

Create `supabase/migrate-2026-07-28.sql`:

```sql
-- Add grade to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade INTEGER CHECK (grade BETWEEN 3 AND 12);

-- Classes
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 3 AND 12),
  teacher_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  exam_id UUID REFERENCES public.exams(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_exam ON public.activity_logs(exam_id);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Add type to exams
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'exam' CHECK (type IN ('exam', 'practice'));

-- RLS policies
CREATE POLICY "Admins can read all classes" ON public.classes FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Teachers read own classes" ON public.classes FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Students read own classes" ON public.class_members FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students read their classes" ON public.classes FOR SELECT USING (EXISTS (SELECT 1 FROM public.class_members WHERE class_id = classes.id AND student_id = auth.uid()));
CREATE POLICY "Admins manage classes" ON public.classes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins manage class_members" ON public.class_members FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Teachers manage own class_members" ON public.class_members FOR ALL USING (EXISTS (SELECT 1 FROM public.classes WHERE id = class_members.class_id AND teacher_id = auth.uid()));
CREATE POLICY "Users read own activity_logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all activity_logs" ON public.activity_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users insert own activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Run migration**

```bash
$env:SUPABASE_ACCESS_TOKEN = "<your-supabase-access-token>"
Set-Location "C:\Users\moaz7\web-exams-site\math-mentor-lms"
npx supabase db query --linked -f supabase/migrate-2026-07-28.sql
```

- [ ] **Step 3: Verify tables exist**

```bash
npx supabase db query --linked "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
```

Expected: classes, class_members, activity_logs appear in list

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add classes, activity_logs tables, grade column, exam type"
```

---

### Task 2: Activity Logging Layer

**Files:**
- Create: `src/lib/activity.ts`
- Create: `src/hooks/useActivityLogger.ts`

**Interfaces:**
- Produces: `logActivity(userId, examId, action, details)` function, `useActivityLogger()` hook with `log(action, details)` method, `fetchActivityLog(userId, filters)` query

- [ ] **Step 1: Create activity lib**

`src/lib/activity.ts`:

```ts
import { supabase } from './supabase'

export type ActivityAction =
  | 'exam_started'
  | 'exam_submitted'
  | 'question_answered'
  | 'practice_answered'
  | 'tab_switch'
  | 'violation'

export async function logActivity(
  userId: string,
  action: ActivityAction,
  details: Record<string, unknown> = {},
  examId?: string
) {
  const { error } = await supabase.from('activity_logs').insert({
    user_id: userId,
    exam_id: examId ?? null,
    action,
    details,
  })
  if (error) console.error('Failed to log activity:', error)
}

export async function fetchActivityLogs(
  userId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function fetchAllActivityLogs(options?: {
  limit?: number
  userId?: string
  examId?: string
  action?: string
}) {
  let query = supabase
    .from('activity_logs')
    .select('*, profiles!inner(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 100)

  if (options?.userId) query = query.eq('user_id', options.userId)
  if (options?.examId) query = query.eq('exam_id', options.examId)
  if (options?.action) query = query.eq('action', options.action)

  const { data, error } = await query
  if (error) throw error
  return data
}
```

- [ ] **Step 2: Create activity logger hook**

`src/hooks/useActivityLogger.ts`:

```ts
import { useCallback } from 'react'
import { useAuth } from './useAuth'
import { logActivity } from '../lib/activity'
import type { ActivityAction } from '../lib/activity'

export function useActivityLogger(examId?: string) {
  const { user } = useAuth()

  const log = useCallback(
    async (action: ActivityAction, details: Record<string, unknown> = {}) => {
      if (!user) return
      await logActivity(user.id, action, details, examId)
    },
    [user, examId]
  )

  return { log }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/activity.ts src/hooks/useActivityLogger.ts
git commit -m "feat: add activity logging layer"
```

---

### Task 3: LatexRenderer Component

**Files:**
- Create: `src/components/LatexRenderer.tsx`

**Interfaces:**
- Produces: `<LatexRenderer content="string" inline?: boolean>` component

- [ ] **Step 1: Add KaTeX CSS**

Add to `src/index.css` or `index.html` `<head>`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
```

- [ ] **Step 2: Create LatexRenderer component**

`src/components/LatexRenderer.tsx`:

```ts
import { useEffect, useRef } from 'react'

interface Props {
  content: string
  inline?: boolean
}

export default function LatexRenderer({ content, inline = false }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current || !window.katex) return
    const blocks = content.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g)
    ref.current.innerHTML = ''
    for (const block of blocks) {
      if (block.startsWith('$$') && block.endsWith('$$')) {
        try {
          const wrapper = document.createElement('div')
          window.katex.render(block.slice(2, -2), wrapper, { displayMode: true, throwOnError: false })
          ref.current.appendChild(wrapper)
        } catch { /* keep raw */ }
      } else if (block.startsWith('$') && block.endsWith('$')) {
        try {
          const wrapper = document.createElement('span')
          window.katex.render(block.slice(1, -1), wrapper, { displayMode: false, throwOnError: false })
          ref.current.appendChild(wrapper)
        } catch {
          ref.current.appendChild(document.createTextNode(block))
        }
      } else {
        ref.current.appendChild(document.createTextNode(block))
      }
    }
  }, [content])

  if (inline) {
    return <span ref={ref} />
  }
  return <span ref={ref} className="katex-wrapper" />
}
```

- [ ] **Step 3: Add KaTeX type declaration**

Create `src/katex.d.ts`:

```ts
interface Window {
  katex: {
    render(expression: string, element: HTMLElement, options?: { displayMode?: boolean; throwOnError?: boolean }): void
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/LatexRenderer.tsx src/katex.d.ts
git commit -m "feat: add KaTeX LaTeX renderer component"
```

---

### Task 4: Settings Page

**Files:**
- Create: `src/pages/Settings.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth` for user, `supabase` for profile update and password change
- Produces: `/settings` route

- [ ] **Step 1: Create Settings page**

`src/pages/Settings.tsx`:

```ts
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const { user, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? '')
  const [grade, setGrade] = useState<number | ''>('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')
    const { error: err } = await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (err) { setError(err.message); return }
    if (grade !== '') {
      await supabase.from('profiles').update({ grade }).eq('id', user!.id)
    }
    setMessage('Profile updated')
    if (refreshProfile) refreshProfile()
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); return }
    setMessage('Password changed')
    setPassword('')
  }

  if (!user) return <p className="text-text-muted">Sign in to access settings</p>

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-8 text-3xl font-black text-text">Settings</h1>

      {message && <p className="mb-4 rounded-lg bg-accent-green/10 p-3 text-accent-green">{message}</p>}
      {error && <p className="mb-4 rounded-lg bg-danger/10 p-3 text-danger">{error}</p>}

      <form onSubmit={handleProfileUpdate} className="mb-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-xl font-bold text-text">Profile</h2>
        <label className="mb-2 block text-sm text-text-muted">Full Name</label>
        <input value={fullName} onChange={e => setFullName(e.target.value)} className="mb-4 w-full rounded-lg border border-border bg-white px-4 py-2 text-text" />
        <label className="mb-2 block text-sm text-text-muted">Grade</label>
        <select value={grade} onChange={e => setGrade(e.target.value ? Number(e.target.value) : '')} className="mb-4 w-full rounded-lg border border-border bg-white px-4 py-2 text-text">
          <option value="">Select grade</option>
          {Array.from({ length: 10 }, (_, i) => i + 3).map(g => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light">Save</button>
      </form>

      <form onSubmit={handlePasswordChange} className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-xl font-bold text-text">Change Password</h2>
        <label className="mb-2 block text-sm text-text-muted">New Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mb-4 w-full rounded-lg border border-border bg-white px-4 py-2 text-text" />
        <button type="submit" className="rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light">Update Password</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Add route in App.tsx**

Add import:
```ts
import Settings from './pages/Settings'
```

Add route inside `<Routes>`:
```ts
<Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Settings.tsx src/App.tsx
git commit -m "feat: add settings page with profile and password editing"
```

---

### Task 5: Admin Panel Framework

**Files:**
- Create: `src/pages/Admin.tsx`
- Create: `src/components/AdminSidebar.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth` for role check
- Produces: `/admin`, `/admin/users`, `/admin/classes`, `/admin/questions`, `/admin/exams`, `/admin/attempts` routes

- [ ] **Step 1: Create AdminSidebar**

`src/components/AdminSidebar.tsx`:

```ts
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
```

- [ ] **Step 2: Create Admin layout wrapper**

`src/pages/Admin.tsx`:

```ts
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AdminSidebar from '../components/AdminSidebar'
import AdminDashboard from './admin/AdminDashboard'
import AdminUsers from './admin/AdminUsers'
import AdminClasses from './admin/AdminClasses'
import AdminQuestions from './admin/AdminQuestions'
import AdminExams from './admin/AdminExams'
import AdminAttempts from './admin/AdminAttempts'

export default function Admin() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!user) navigate('/login')
    else if (profile?.role !== 'admin') navigate('/')
  }, [user, profile, navigate])

  if (!profile || profile.role !== 'admin') return null

  const section = location.pathname.split('/admin')[1] || ''

  return (
    <div className="flex gap-8">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        {section === '' && <AdminDashboard />}
        {section === '/users' && <AdminUsers />}
        {section === '/classes' && <AdminClasses />}
        {section === '/questions' && <AdminQuestions />}
        {section === '/exams' && <AdminExams />}
        {section === '/attempts' && <AdminAttempts />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add admin route in App.tsx**

Add import:
```ts
import Admin from './pages/Admin'
```

Add route:
```ts
<Route path="/admin" element={<AppLayout><Admin /></AppLayout>} />
<Route path="/admin/:section" element={<AppLayout><Admin /></AppLayout>} />
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Admin.tsx src/components/AdminSidebar.tsx src/App.tsx
git commit -m "feat: add admin panel framework with sidebar navigation"
```

---

### Task 6: Admin Dashboard (Stats + Charts)

**Files:**
- Create: `src/pages/admin/AdminDashboard.tsx`
- Modify: `src/pages/Dashboard.tsx` (add student chart)

**Interfaces:**
- Consumes: `supabase` for aggregate queries, `fetchAllActivityLogs` from activity lib
- Produces: /admin dashboard with cards + 2 charts

- [ ] **Step 1: Create AdminDashboard page**

`src/pages/admin/AdminDashboard.tsx`:

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#1982C4', '#00784A', '#E8BB1A', '#DC3545']

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersRes, examsRes, attemptsRes, classesRes] = await Promise.all([
        supabase.from('profiles').select('id, role, created_at', { count: 'exact', head: false }),
        supabase.from('exams').select('id, type', { count: 'exact', head: false }),
        supabase.from('exam_attempts').select('id, score, created_at', { count: 'exact', head: false }).not('score', 'is', null),
        supabase.from('classes').select('id', { count: 'exact', head: false }),
      ])
      return {
        totalUsers: usersRes.count ?? 0,
        totalExams: examsRes.count ?? 0,
        totalAttempts: attemptsRes.count ?? 0,
        totalClasses: classesRes.count ?? 0,
        users: usersRes.data ?? [],
        attempts: attemptsRes.data ?? [],
        exams: examsRes.data ?? [],
      }
    },
  })

  const roleData = (() => {
    if (!stats) return []
    const counts: Record<string, number> = {}
    for (const u of stats.users) { counts[u.role] = (counts[u.role] ?? 0) + 1 }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  })()

  const scoreData = (() => {
    if (!stats) return []
    const buckets: Record<string, number> = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 }
    for (const a of stats.attempts) {
      const s = a.score ?? 0
      if (s <= 20) buckets['0-20']++
      else if (s <= 40) buckets['21-40']++
      else if (s <= 60) buckets['41-60']++
      else if (s <= 80) buckets['61-80']++
      else buckets['81-100']++
    }
    return Object.entries(buckets).map(([range, count]) => ({ range, count }))
  })()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Dashboard</h1>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        {[
          { label: 'Users', value: stats?.totalUsers ?? 0, color: 'border-brand/30 bg-brand/5' },
          { label: 'Exams', value: stats?.totalExams ?? 0, color: 'border-accent-green/30 bg-accent-green/5' },
          { label: 'Attempts', value: stats?.totalAttempts ?? 0, color: 'border-accent-gold/30 bg-accent-gold/5' },
          { label: 'Classes', value: stats?.totalClasses ?? 0, color: 'border-accent-green/30 bg-accent-green/5' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border p-5 ${card.color}`}>
            <p className="text-sm text-text-muted">{card.label}</p>
            <p className="mt-1 text-3xl font-black text-text">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-bold text-text">Users by Role</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-bold text-text">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#1982C4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add student chart to Dashboard.tsx**

Add after the "Recent Attempts" section:

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Inside component, after the attempts list:
{completedAttempts.length >= 2 && (
  <div className="mt-8 rounded-xl border border-border bg-surface p-6">
    <h2 className="mb-4 text-lg font-bold text-text">Score Trend</h2>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={completedAttempts.slice().reverse().slice(-10).map(a => ({ name: new Date(a.started_at).toLocaleDateString(), score: a.score ?? 0 }))}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#1982C4" strokeWidth={2} dot={{ fill: '#1982C4' }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminDashboard.tsx
git commit -m "feat: add admin dashboard with stats cards and charts"
```

---

### Task 7: Admin Users Page

**Files:**
- Create: `src/pages/admin/AdminUsers.tsx`
- Modify: `src/lib/supabase.ts` (no changes needed)

- [ ] **Step 1: Create AdminUsers page**

`src/pages/admin/AdminUsers.tsx`:

```ts
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, class_members!left(class_id, classes!left(id, name, grade))')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const filtered = (users ?? []).filter((u) => {
    if (search && !u.email?.toLowerCase().includes(search.toLowerCase()) && !u.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter && u.role !== roleFilter) return false
    return true
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Users</h1>

      <div className="mb-4 flex gap-3">
        <input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-white px-4 py-2 text-text"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-text">
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {isLoading && <p className="text-text-muted">Loading...</p>}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-text-muted">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => (
              <tr key={u.id} className="text-text hover:bg-surface/50">
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.full_name}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })}
                    className="rounded border border-border bg-white px-2 py-1 text-xs"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">{u.grade ?? '-'}</td>
                <td className="px-4 py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { if (confirm('Delete this user?')) supabase.from('profiles').delete().eq('id', u.id).then(() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })) }}
                    className="text-xs text-danger hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/AdminUsers.tsx
git commit -m "feat: add admin users page with search, filter, role change"
```

---

### Task 8: Admin Classes Page

**Files:**
- Create: `src/pages/admin/AdminClasses.tsx`
- Create: `src/lib/classes.ts`

- [ ] **Step 1: Create classes lib**

`src/lib/classes.ts`:

```ts
import { supabase } from './supabase'

export async function fetchClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select('*, profiles!left(email, full_name), class_members(count)')
    .order('grade')
    .order('name')
  if (error) throw error
  return data
}

export async function createClass(name: string, grade: number, teacherId?: string) {
  const { data, error } = await supabase
    .from('classes')
    .insert({ name, grade, teacher_id: teacherId ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteClass(id: string) {
  const { error } = await supabase.from('classes').delete().eq('id', id)
  if (error) throw error
}

export async function fetchClassMembers(classId: string) {
  const { data, error } = await supabase
    .from('class_members')
    .select('*, profiles!inner(id, email, full_name)')
    .eq('class_id', classId)
  if (error) throw error
  return data
}

export async function addStudentToClass(classId: string, studentId: string) {
  const { error } = await supabase.from('class_members').insert({ class_id: classId, student_id: studentId })
  if (error) throw error
}

export async function removeStudentFromClass(classId: string, studentId: string) {
  const { error } = await supabase
    .from('class_members')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentId)
  if (error) throw error
}

export async function fetchAvailableStudents() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'student')
    .order('full_name')
  if (error) throw error
  return data
}

export async function fetchAvailableTeachers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'teacher')
    .order('full_name')
  if (error) throw error
  return data
}
```

- [ ] **Step 2: Create AdminClasses page**

`src/pages/admin/AdminClasses.tsx`:

```ts
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchClasses, createClass, deleteClass, fetchClassMembers, addStudentToClass, removeStudentFromClass, fetchAvailableStudents, fetchAvailableTeachers } from '../../lib/classes'

export default function AdminClasses() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState<number>(3)
  const [newTeacher, setNewTeacher] = useState('')
  const [expandedClass, setExpandedClass] = useState<string | null>(null)

  const { data: classes } = useQuery({ queryKey: ['admin-classes'], queryFn: fetchClasses })
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: fetchAvailableTeachers })
  const { data: students } = useQuery({ queryKey: ['students'], queryFn: fetchAvailableStudents })
  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ['class-members', expandedClass],
    queryFn: () => fetchClassMembers(expandedClass!),
    enabled: !!expandedClass,
  })

  const createMutation = useMutation({
    mutationFn: () => createClass(newName, newGrade, newTeacher || undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-classes'] }); setShowCreate(false); setNewName(''); setNewGrade(3); setNewTeacher('') },
  })

  const addMutation = useMutation({
    mutationFn: ({ studentId }: { studentId: string }) => addStudentToClass(expandedClass!, studentId),
    onSuccess: () => refetchMembers(),
  })

  const removeMutation = useMutation({
    mutationFn: ({ studentId }: { studentId: string }) => removeStudentFromClass(expandedClass!, studentId),
    onSuccess: () => refetchMembers(),
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Classes</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
          {showCreate ? 'Cancel' : '+ New Class'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 font-bold text-text">Create Class</h2>
          <div className="flex gap-3">
            <input placeholder="Class name" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 rounded-lg border border-border bg-white px-4 py-2 text-text" />
            <select value={newGrade} onChange={e => setNewGrade(Number(e.target.value))} className="rounded-lg border border-border bg-white px-4 py-2 text-text">
              {Array.from({ length: 10 }, (_, i) => i + 3).map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <select value={newTeacher} onChange={e => setNewTeacher(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-text">
              <option value="">No teacher</option>
              {teachers?.map(t => <option key={t.id} value={t.id}>{t.full_name ?? t.email}</option>)}
            </select>
            <button onClick={() => createMutation.mutate()} className="rounded-lg bg-accent-green px-4 py-2 text-sm font-semibold text-white">Create</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {classes?.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-surface">
            <button onClick={() => setExpandedClass(expandedClass === c.id ? null : c.id)} className="flex w-full items-center justify-between p-4 text-left">
              <div>
                <span className="font-bold text-text">{c.name}</span>
                <span className="ml-3 text-sm text-text-muted">Grade {c.grade}</span>
                <span className="ml-3 text-sm text-text-muted">{(c as any).profiles?.full_name ?? 'No teacher'}</span>
                <span className="ml-3 text-sm text-text-muted">{(c as any).class_members?.[0]?.count ?? 0} students</span>
              </div>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete class?')) deleteClass(c.id).then(() => queryClient.invalidateQueries({ queryKey: ['admin-classes'] })) }} className="text-xs text-danger hover:underline">Delete</button>
              </div>
            </button>

            {expandedClass === c.id && (
              <div className="border-t border-border p-4">
                <h3 className="mb-3 text-sm font-bold text-text-muted uppercase">Students</h3>
                <div className="mb-3 flex gap-2">
                  <select id="add-student-select" className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text" defaultValue="">
                    <option value="" disabled>Select student to add...</option>
                    {students?.filter(s => !members?.find(m => m.student_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
                  </select>
                  <button onClick={() => {
                    const sel = document.getElementById('add-student-select') as HTMLSelectElement
                    if (sel.value) addMutation.mutate({ studentId: sel.value })
                  }} className="rounded-lg bg-accent-green px-3 py-1.5 text-sm text-white">Add</button>
                </div>
                <div className="space-y-1">
                  {members?.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                      <span className="text-text">{(m as any).profiles?.full_name ?? (m as any).profiles?.email}</span>
                      <button onClick={() => removeMutation.mutate({ studentId: m.student_id })} className="text-xs text-danger hover:underline">Remove</button>
                    </div>
                  ))}
                  {members?.length === 0 && <p className="text-sm text-text-muted">No students in this class</p>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminClasses.tsx src/lib/classes.ts
git commit -m "feat: add admin classes page with CRUD and member management"
```

---

### Task 9: Admin Questions & Exams Pages

**Files:**
- Create: `src/pages/admin/AdminQuestions.tsx`
- Create: `src/pages/admin/AdminExams.tsx`
- Create: `src/pages/admin/AdminAttempts.tsx`

- [ ] **Step 1: Create AdminQuestions page**

`src/pages/admin/AdminQuestions.tsx` — table with columns: type (badge), subject, topic, difficulty (1-4 dots), preview (truncated 60 chars), created_at. Filters: type dropdown, difficulty buttons, subject input. Actions: Delete button with confirm. Data via `supabase.from('questions').select('*').order('created_at', { ascending: false })`.

```tsx
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import LatexRenderer from '../../components/LatexRenderer'

export default function AdminQuestions() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')
  const [diffFilter, setDiffFilter] = useState<number | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const { data: questions } = useQuery({
    queryKey: ['admin-questions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const filtered = (questions ?? []).filter(q =>
    (!typeFilter || q.type === typeFilter) &&
    (!diffFilter || q.difficulty === diffFilter)
  )

  const selectedQ = selected ? filtered.find(q => q.id === selected) : null

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Questions</h1>
      <div className="mb-4 flex gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-text">
          <option value="">All types</option>
          <option value="multiple_choice">Multiple Choice</option>
          <option value="true_false">True/False</option>
          <option value="short_answer">Short Answer</option>
        </select>
        {[1, 2, 3, 4].map(d => (
          <button key={d} onClick={() => setDiffFilter(diffFilter === d ? null : d)}
            className={`rounded-lg border px-3 py-1 text-sm ${diffFilter === d ? 'bg-brand text-white border-brand' : 'border-border text-text-muted'}`}>
            {['Easy', 'Intermediate', 'Hard', 'Expert'][d - 1]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-text-muted"><tr>
              <th className="px-4 py-3">Type</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Topic</th><th className="px-4 py-3">Difficulty</th><th className="px-4 py-3">Preview</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map(q => (
                <tr key={q.id} onClick={() => setSelected(q.id)} className={`cursor-pointer text-text hover:bg-surface/50 ${selected === q.id ? 'bg-brand/10' : ''}`}>
                  <td className="px-4 py-3"><span className="rounded bg-brand/10 px-2 py-0.5 text-xs text-brand">{q.type.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3">{q.subject}</td>
                  <td className="px-4 py-3">{q.topic}</td>
                  <td className="px-4 py-3">{'●'.repeat(q.difficulty)}{'○'.repeat(4 - q.difficulty)}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-text-muted">{q.question_text.replace(/[$]/g, '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedQ && (
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-text">Question Detail</h2>
              <button onClick={() => { if (confirm('Delete this question?')) supabase.from('questions').delete().eq('id', selectedQ.id).then(() => { queryClient.invalidateQueries({ queryKey: ['admin-questions'] }); setSelected(null) }) }} className="text-sm text-danger hover:underline">Delete</button>
            </div>
            <p className="mb-4 text-lg font-medium text-text"><LatexRenderer content={selectedQ.question_text} /></p>
            {selectedQ.options?.length > 0 && (
              <div className="mb-4 space-y-2">
                {selectedQ.options.map((opt: string, i: number) => (
                  <div key={i} className={`rounded-lg border p-3 ${String(i) === selectedQ.correct_answer ? 'border-accent-green bg-accent-green/5' : 'border-border'}`}>
                    <LatexRenderer content={opt} />
                  </div>
                ))}
              </div>
            )}
            <p className="mb-2 text-sm"><span className="font-bold text-accent-green">Answer:</span> <LatexRenderer content={selectedQ.correct_answer} /></p>
            <p className="text-sm text-text-muted"><LatexRenderer content={selectedQ.explanation} /></p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create AdminExams page**

`src/pages/admin/AdminExams.tsx` — table: title, type (badge), time (if exam), passing_score, published (toggle checkbox), created_at. Filter by type. Each row shows Start/Stop button for published toggle. Delete button.

```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function AdminExams() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')

  const { data: exams } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from('exams').update({ is_published }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-exams'] }),
  })

  const deleteExam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exams').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-exams'] }),
  })

  const filtered = (exams ?? []).filter(e => !typeFilter || e.type === typeFilter)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Exams</h1>
      <div className="mb-4 flex gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-text">
          <option value="">All types</option>
          <option value="exam">Exam</option>
          <option value="practice">Practice</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-text-muted"><tr>
            <th className="px-4 py-3">Title</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Pass %</th><th className="px-4 py-3">Published</th><th className="px-4 py-3">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map(e => (
              <tr key={e.id} className="text-text hover:bg-surface/50">
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs ${e.type === 'exam' ? 'bg-accent-gold/10 text-accent-gold' : 'bg-accent-green/10 text-accent-green'}`}>{e.type}</span></td>
                <td className="px-4 py-3">{e.type === 'exam' ? `${e.time_limit_minutes} min` : '-'}</td>
                <td className="px-4 py-3">{e.type === 'exam' ? `${e.passing_score}%` : '-'}</td>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={e.is_published} onChange={() => togglePublished.mutate({ id: e.id, is_published: !e.is_published })} className="h-4 w-4 accent-brand" />
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => { if (confirm('Delete this exam?')) deleteExam.mutate(e.id) }} className="text-xs text-danger hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create AdminAttempts page**

`src/pages/admin/AdminAttempts.tsx` — table: student email, exam title, score, status, time spent, started_at. Filter by status, date range (this month / all). Click a row to expand showing full answer breakdown.

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function AdminAttempts() {
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: attempts } = useQuery({
    queryKey: ['admin-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*, profiles!inner(email, full_name), exams!inner(title, type)')
        .order('started_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    },
  })

  const { data: answers } = useQuery({
    queryKey: ['admin-attempt-answers', expanded],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('answers')
        .select('*, questions!inner(question_text, correct_answer, explanation)')
        .eq('attempt_id', expanded!)
      if (error) throw error
      return data
    },
    enabled: !!expanded,
  })

  const filtered = (attempts ?? []).filter(a => !statusFilter || a.status === statusFilter)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Attempts</h1>
      <div className="mb-4 flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-text">
          <option value="">All status</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="abandoned">Abandoned</option>
        </select>
      </div>
      <div className="space-y-2">
        {filtered.map(a => (
          <div key={a.id} className="rounded-xl border border-border bg-surface">
            <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="flex w-full items-center justify-between p-4 text-left">
              <div className="flex items-center gap-4">
                <span className="font-medium text-text">{(a as any).profiles?.email}</span>
                <span className="text-text-muted">{(a as any).exams?.title}</span>
                {a.status === 'completed' && <span className="font-bold text-accent-green">{a.score}%</span>}
                <span className={`rounded px-2 py-0.5 text-xs ${a.status === 'completed' ? 'bg-accent-green/10 text-accent-green' : a.status === 'in_progress' ? 'bg-accent-gold/10 text-accent-gold' : 'bg-danger/10 text-danger'}`}>{a.status}</span>
              </div>
              <span className="text-xs text-text-muted">{new Date(a.started_at).toLocaleDateString()}</span>
            </button>
            {expanded === a.id && answers && (
              <div className="border-t border-border p-4 space-y-3">
                {answers.map((ans: any) => (
                  <div key={ans.id} className={`rounded-lg border p-3 ${ans.is_correct ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'}`}>
                    <p className="font-medium text-text">{ans.questions?.question_text}</p>
                    <p className="text-sm mt-1">Your answer: <span className={ans.is_correct ? 'text-accent-green' : 'text-danger'}>{ans.answer}</span></p>
                    {!ans.is_correct && <p className="text-sm text-accent-green">Correct: {ans.questions?.correct_answer}</p>}
                    <p className="text-xs text-text-muted mt-1">{ans.questions?.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/
git commit -m "feat: add admin questions, exams, and attempts pages"
```

---

### Task 10: Practice Mode + Grade Filtering

**Files:**
- Create: `src/pages/Practice.tsx`
- Modify: `src/pages/Exams.tsx`
- Modify: `src/pages/Exam.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add practice route**

Route: `/practice/:id`

- [ ] **Step 2: Create Practice page**

`src/pages/Practice.tsx` — loads exam questions via `fetchExamWithQuestions`, shows one at a time, user selects answer, immediately shows correct/wrong + explanation, Next button advances. At end shows summary of all answers with correct/wrong.

```tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchExamWithQuestions } from '../lib/exams'
import { useAuth } from '../hooks/useAuth'
import { useActivityLogger } from '../hooks/useActivityLogger'
import { supabase } from '../lib/supabase'
import LatexRenderer from '../components/LatexRenderer'

export default function Practice() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { log } = useActivityLogger(id)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<{ questionId: string; given: string; correct: boolean }[]>([])
  const [completed, setCompleted] = useState(false)

  const { data: exam } = useQuery({
    queryKey: ['practice', id],
    queryFn: () => fetchExamWithQuestions(id!),
    enabled: !!id,
  })

  useEffect(() => { if (!user) navigate('/login') }, [user, navigate])

  if (!exam || !exam.questions || exam.questions.length === 0) return <p className="text-text-muted">Loading...</p>

  const eqs = exam.questions
  const current = eqs[currentIndex]
  if (!current) return <p className="text-text-muted">Loading question...</p>

  const handleSubmit = () => {
    if (!selectedAnswer || !user) return
    const correct = selectedAnswer === current.question.correct_answer
    const newAnswers = [...answers, { questionId: current.question.id, given: selectedAnswer, correct }]
    setAnswers(newAnswers)
    setSubmitted(true)
    log('practice_answered', { question_id: current.question.id, correct, answer_given: selectedAnswer })
  }

  const handleNext = () => {
    if (currentIndex < eqs.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setSubmitted(false)
    } else {
      setCompleted(true)
      log('exam_submitted', { total: eqs.length, correct: answers.filter(a => a.correct).length })
    }
  }

  if (completed) {
    const correctCount = answers.filter(a => a.correct).length
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-black text-text">Practice Complete!</h1>
        <div className="mb-6 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-5xl font-black text-text">{correctCount}/{eqs.length}</p>
          <p className="mt-2 text-text-muted">{(correctCount / eqs.length * 100).toFixed(0)}% correct</p>
        </div>
        {eqs.map((eq, i) => {
          const ans = answers[i]
          return (
            <div key={eq.id} className={`mb-3 rounded-xl border p-4 ${ans?.correct ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'}`}>
              <p className="font-medium text-text"><LatexRenderer content={eq.question.question_text} /></p>
              <p className="mt-1 text-sm">Your answer: <span className={ans?.correct ? 'text-accent-green' : 'text-danger'}>{ans?.given}</span></p>
              {!ans?.correct && <p className="text-sm text-accent-green">Correct: {eq.question.correct_answer}</p>}
              <p className="mt-1 text-xs text-text-muted"><LatexRenderer content={eq.question.explanation} /></p>
            </div>
          )
        })}
        <button onClick={() => navigate('/exams')} className="mt-4 rounded-lg bg-brand px-6 py-2 font-semibold text-white">Back to Exams</button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">{exam.title}</h1>
        <span className="text-sm text-text-muted">Question {currentIndex + 1} of {eqs.length}</span>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-surface p-6">
        <p className="mb-6 text-lg font-medium text-text"><LatexRenderer content={current.question.question_text} /></p>

        {current.question.type === 'multiple_choice' && current.question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => !submitted && setSelectedAnswer(String(i))}
            className={`mb-2 block w-full rounded-lg border p-4 text-left transition ${
              submitted
                ? String(i) === current.question.correct_answer
                  ? 'border-accent-green bg-accent-green/5'
                  : selectedAnswer === String(i)
                    ? 'border-danger bg-danger/5'
                    : 'border-border'
                : selectedAnswer === String(i)
                  ? 'border-brand bg-brand/5'
                  : 'border-border hover:border-brand/50'
            }`}
          >
            <LatexRenderer content={opt} />
          </button>
        ))}

        {current.question.type === 'true_false' && ['true', 'false'].map(opt => (
          <button
            key={opt}
            onClick={() => !submitted && setSelectedAnswer(opt)}
            className={`mb-2 block w-full rounded-lg border p-4 text-left transition ${
              submitted
                ? opt === current.question.correct_answer
                  ? 'border-accent-green bg-accent-green/5'
                  : selectedAnswer === opt
                    ? 'border-danger bg-danger/5'
                    : 'border-border'
                : selectedAnswer === opt
                  ? 'border-brand bg-brand/5'
                  : 'border-border hover:border-brand/50'
            }`}
          >
            {opt === 'true' ? 'True' : 'False'}
          </button>
        ))}

        {current.question.type === 'short_answer' && (
          <input
            value={selectedAnswer ?? ''}
            onChange={e => !submitted && setSelectedAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="w-full rounded-lg border border-border bg-white px-4 py-3 text-text"
            disabled={submitted}
          />
        )}
      </div>

      {submitted && (
        <div className={`mb-6 rounded-xl border p-4 ${answers[answers.length - 1]?.correct ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'}`}>
          <p className={`font-bold ${answers[answers.length - 1]?.correct ? 'text-accent-green' : 'text-danger'}`}>
            {answers[answers.length - 1]?.correct ? 'Correct!' : 'Wrong'}
          </p>
          {!answers[answers.length - 1]?.correct && <p className="text-sm text-accent-green mt-1">Correct answer: {current.question.correct_answer}</p>}
          <p className="mt-1 text-sm text-text-muted"><LatexRenderer content={current.question.explanation} /></p>
        </div>
      )}

      <div className="flex justify-between">
        {submitted
          ? <button onClick={handleNext} className="rounded-lg bg-brand px-6 py-2 font-semibold text-white">
              {currentIndex < eqs.length - 1 ? 'Next Question →' : 'See Results'}
            </button>
          : <button onClick={handleSubmit} disabled={!selectedAnswer} className="rounded-lg bg-brand px-6 py-2 font-semibold text-white disabled:opacity-50">Submit Answer</button>
        }
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add practice route in App.tsx**

```ts
import Practice from './pages/Practice'
// ...
<Route path="/practice/:id" element={<Practice />} />
```

- [ ] **Step 4: Add grade filter to Exams page**

In `src/pages/Exams.tsx`, fetch student profile grade and use it to filter exams. Also add a type badge on each exam card.

```tsx
// Add to imports:
import { supabase } from '../lib/supabase'

// Add alongside user fetch:
const { data: profile } = useQuery({
  queryKey: ['my-profile'],
  queryFn: async () => {
    const { data } = await supabase.from('profiles').select('grade').eq('id', user!.id).single()
    return data
  },
  enabled: !!user,
})

// In the exam list JSX, add badge:
<span className={`rounded px-2 py-0.5 text-xs ${exam.type === 'exam' ? 'bg-accent-gold/10 text-accent-gold' : 'bg-accent-green/10 text-accent-green'}`}>
  {exam.type === 'exam' ? 'Exam' : 'Practice'}
</span>

// Route practice exams to /practice/:id instead of /exam/:id:
{exam.type === 'practice' ? `/practice/${exam.id}` : `/exam/${exam.id}`}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Practice.tsx src/pages/Exams.tsx src/pages/Exam.tsx src/App.tsx
git commit -m "feat: add practice mode with instant feedback and grade filtering"
```

---

### Task 11: Enhanced Post-Exam Results

**Files:**
- Modify: `src/pages/Results.tsx`

- [ ] **Step 1: Enhance Results page**

`src/pages/Results.tsx` — Already exists with basic score display. Enhance to show each question card with: correct/wrong border color, student answer vs correct answer, KaTeX-rendered explanation, and common mistakes section.

```tsx
// Add these imports at top:
import { useParams } from 'react-router-dom'
import LatexRenderer from '../components/LatexRenderer'

// In the return, after the score card, map over questions with answers:
// For each attempt question, show:
{answers?.map((ans: any) => (
  <div key={ans.id} className={`rounded-xl border p-4 ${ans.is_correct ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'}`}>
    <LatexRenderer content={ans.questions?.question_text} />
    <div className="mt-3 space-y-1 text-sm">
      <p>Your answer: <span className={ans.is_correct ? 'text-accent-green' : 'text-danger'}>{ans.answer}</span></p>
      {!ans.is_correct && <p className="text-accent-green">Correct answer: {ans.questions?.correct_answer}</p>}
      <p className="mt-2 text-text-muted"><LatexRenderer content={ans.questions?.explanation} /></p>
      {ans.questions?.common_mistakes?.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-text-muted hover:text-text">Common Mistakes</summary>
          <div className="mt-1 space-y-1">
            {ans.questions.common_mistakes.map((m: any, i: number) => (
              <p key={i} className="text-xs text-text-muted">• {m.mistake} — {m.why}</p>
            ))}
          </div>
        </details>
      )}
    </div>
  </div>
))}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Results.tsx
git commit -m "feat: enhance exam results with explanations and correct answers"
```

---

### Task 12: Wire Anti-Cheat to Activity Logging

**Files:**
- Modify: `src/hooks/useAntiCheat.ts`
- Modify: `src/pages/Exam.tsx`

- [ ] **Step 1: Connect addViolation to activity logger**

In `src/pages/Exam.tsx`, add `useActivityLogger` hook and pass a `logViolation` wrapper to `useAntiCheat`:

```tsx
import { useActivityLogger } from '../hooks/useActivityLogger'

// Inside component:
const { log } = useActivityLogger(id)

// Update useAntiCheat call:
const { state, addViolation } = useAntiCheat({
  onViolation: (type: string) => {
    log('violation', { type, detail: `${type} detected during exam` })
  },
})
```

In `src/hooks/useAntiCheat.ts`, accept an optional `onViolation` callback and call it when violations are recorded:

```ts
interface AntiCheatOptions {
  onViolation?: (type: string) => void
  maxViolations?: number
}

export function useAntiCheat(options: AntiCheatOptions = {}) {
  const { onViolation, maxViolations = 5 } = options
  // In handleBlur, handleKeyDown, etc., before setViolations:
  // if (onViolation) onViolation('blur' | 'copy' | 'paste' | 'contextmenu' | 'devtools_open')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAntiCheat.ts src/pages/Exam.tsx
git commit -m "feat: wire anti-cheat violations to activity logging"
```

---

### Task 13: Add Activity Log to Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add recent activity section**

In `src/pages/Dashboard.tsx`, add after the attempts section:

```tsx
import { fetchActivityLogs } from '../lib/activity'

const { data: activity } = useQuery({
  queryKey: ['my-activity', user?.id],
  queryFn: () => fetchActivityLogs(user!.id, 10),
  enabled: !!user,
})

// In JSX, after the attempts section:
{activity && activity.length > 0 && (
  <div className="mt-8">
    <h2 className="mb-4 text-xl font-bold text-text">Recent Activity</h2>
    <div className="space-y-2">
      {activity.map((a) => (
        <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
          <div>
            <p className="text-sm font-medium text-text">{a.action.replace(/_/g, ' ')}</p>
            <p className="text-xs text-text-muted">
              {new Date(a.created_at).toLocaleString()}
              {a.exam_id && ` • Exam: ${a.exam_id.slice(0, 8)}...`}
            </p>
          </div>
          <span className="text-xs text-text-muted">
            {a.action === 'exam_submitted' ? `${JSON.stringify(a.details).slice(0, 30)}` : ''}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add recent activity log to student dashboard"
```

---

### Task 14: Build, Verify, and Deploy

**Files:** None

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: clean tsc + vite build (no errors)

- [ ] **Step 2: Verify build output**

Check dist/ has index.html + assets

- [ ] **Step 3: Deploy**

```bash
git add -A
git commit -m "feat: admin panel, classes, practice mode, analytics, and settings"
git push
```
