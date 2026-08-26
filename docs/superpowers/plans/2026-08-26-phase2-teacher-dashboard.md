# Phase 2 — shadcn-style UI kit + Teacher Dashboard Rebuild

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Turn the 64-line TeacherDashboard into a tabbed command center (Overview / Students / Exams / Question Bank) wired to real Supabase data, using a small in-repo shadcn-style UI kit themed to House v2.

**Architecture:** No CLI. Hand-created `components/ui/*` (shadcn patterns, House v2 values) because the codebase uses relative imports and a custom `@theme`; CLI init would fight both. Views live in `src/components/teacher/*`, composed by `src/pages/TeacherDashboard.tsx` via `@radix-ui/react-tabs` (already a dependency). All data via TanStack Query + existing `src/lib/*` functions. Exam CREATION stays in `/admin/exams` (YAGNI).

**Tech:** React 19, Tailwind v4 `@theme`, Radix tabs, Recharts (already used), vitest + self-chaining supabase mock (pattern: `src/test/pages/AdminExams.test.tsx`).

## Global Constraints

- House v2 hexes ONLY (#0A9396/#0A6F72/#1A1A2E/#84A98C/#D4A373/#E76F51/#2D3436/#FAF9F6). Never hardcode old palette in ANY form incl. rgba decimal rgb(17,42,67).
- English-only strings.
- NO auth/session code touched.
- Branch `feat/phase2-teacher-dashboard`, merge only when gates green.
- Relative imports (`../../lib/...`) matching codebase style; do NOT introduce `@/` alias.
- Every task ends green: `npm run build && npm run test`.

---

### Task 1: `cn` util + UI kit (card, badge, table, tabs)

**Files:**
- Create: `src/lib/utils.ts`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/table.tsx`, `src/components/ui/tabs.tsx`
- Modify: `package.json` (add `clsx`, `tailwind-merge`)

**Interfaces (produced):**
- `cn(...inputs: ClassValue[]): string`
- Card parts: `Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter` (div-based, className merge)
- `Badge({ variant?: 'default'|'success'|'warning'|'danger'|'outline', className?, children })`
- Table parts: `Table, TableHeader, TableBody, TableRow, TableHead, TableCell`
- `Tabs, TabsList, TabsTrigger, TabsContent` wrapping `@radix-ui/react-tabs`

- [ ] **Step 1: install deps**

```bash
npm install clsx tailwind-merge
```

- [ ] **Step 2: `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: `src/components/ui/card.tsx`** — House v2: rounded-xl border-border bg-surface shadow-sm (DESIGN.md §2.4)

```tsx
import { cn } from '../../lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-border bg-surface shadow-sm', className)} {...props} />
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-3', className)} {...props} />
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-display text-lg font-semibold text-ink', className)} {...props} />
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-text-muted', className)} {...props} />
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 p-5 pt-0', className)} {...props} />
}
```

- [ ] **Step 4: `src/components/ui/badge.tsx`**

```tsx
import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-brand/10 text-brand-light border-brand/20',
  success: 'bg-accent-green/15 text-[#3E5F4A] border-accent-green/30',
  warning: 'bg-accent-gold/20 text-[#8A5A1E] border-accent-gold/40',
  danger: 'bg-[#FDF0ED] text-[#9C3B22] border-[#E76F51]/40',
  outline: 'border-border bg-surface text-ink',
} as const

export function Badge({
  variant = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
```

(All literal hexes are canonical dark tints from DESIGN.md §2.1: #3E5F4A sage-dark, #8A5A1E gold-dark, #9C3B22 terra-dark, #FDF0ED terra-light.)

- [ ] **Step 5: `src/components/ui/table.tsx`**

```tsx
import { cn } from '../../lib/utils'

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-surface">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}
export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-border bg-paper', className)} {...props} />
}
export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}
export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-border/60 transition-colors hover:bg-canvas-soft', className)} {...props} />
}
export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-muted', className)} {...props} />
}
export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle text-ink', className)} {...props} />
}
```

- [ ] **Step 6: `src/components/ui/tabs.tsx`**

```tsx
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../lib/utils'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1', className)}
      {...props}
    />
  )
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium text-text-muted transition-colors',
        'hover:text-ink data-[state=active]:bg-brand data-[state=active]:text-white',
        className,
      )}
      {...props}
    />
  )
}
export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('mt-6 focus-visible:outline-none', className)} {...props} />
}
```

- [ ] **Step 7: verify + commit**

```bash
npm run build && git add -A && git commit -m "feat(ui): add cn util + House v2 card/badge/table/tabs kit"
```

### Task 2: Overview view (KPIs + distribution chart + recent submissions)

**Files:**
- Create: `src/components/teacher/OverviewView.tsx`
- Test: `src/test/components/teacher/OverviewView.test.tsx`

**Interfaces (consumes):** supabase tables `exam_attempts` (score,total_points,status,started_at,user_id,exam_id), `exams` (id,title,created_by,is_published), `activity_logs` (action,created_at), `profiles` (full_name). Query keys: `['td-overview', uid]`.

- [ ] **Step 1: failing test** — mock supabase chain (pattern from AdminExams.test.tsx): exams→3 rows, attempts→completed scores [80,60,40], activity_logs→2 violation actions. Assert: renders "3" exams KPI, "60" avg score, "2" flagged violations, and a recent-submission row containing mocked student name.

- [ ] **Step 2: implement** `OverviewView.tsx`: three useQuery blocks keyed `['td-overview', user.id, 'exams'|'attempts'|'violations']`; compute weekAgo = Date.now()-7d; KPI cards (Card): My Exams / Attempts (7d) / Avg Score % / Flagged Violations; Recharts `BarChart` of score buckets [0-49,50-69,70-84,85-100]; recent 8 attempts table (student, exam title, score%, when) via `Table*`. Empty states use muted text (DESIGN.md warm-empty rule).

- [ ] **Step 3: green** — `npm run test -- src/test/components/teacher` then full `npm run build`.

- [ ] **Step 4: commit** `feat(teacher): overview view with kpis, chart, submissions`

### Task 3: Students view

**Files:** Create `src/components/teacher/StudentsView.tsx`; Test `src/test/components/teacher/StudentsView.test.tsx`

**Interfaces:** queries `profiles` (id,full_name,grade) eq role 'student' order full_name; `exam_attempts` (user_id,score,status) for aggregate. Produces: `StudentsView` (search state filters client-side).

- [ ] Steps: failing test (2 students, one with attempts [100,50] → shows "75%" avg, other "—") → implement Table with columns Student/Grade/Attempts/Avg Score + search `<input className="input">` filtering by name → green → commit `feat(teacher): students table with search + averages`

### Task 4: Exams view (publish toggle + Telegram copy-report)

**Files:** Create `src/components/teacher/ExamsView.tsx`; Test `.../ExamsView.test.tsx`

**Interfaces:** consumes `fetchExams()` (lib/exams), `startAttempt` NOT used here; mutation: `supabase.from('exams').update({is_published}).eq('id')`; consumes `buildWeeklyReport(name, stats)` + stats shape `{examsTaken, avgScore, bestScore, subjects:{[t]:{taken,correct}}}` from lib/telegram — VERIFY exact param shape by reading src/lib/telegram.ts before writing (adjust call accordingly). Button "Copy Telegram report" → `navigator.clipboard.writeText(report)` then button label flips to "Copied ✓" for 2s. Badge shows Published/Draft; toggle via switch-styled checkbox.

- [ ] Steps: failing test (publish toggle calls update with inverted flag; copy writes clipboard) → implement → green → commit `feat(teacher): exams manager with publish toggle + telegram copy-report`

### Task 5: Question Bank browse view

**Files:** Create `src/components/teacher/BankView.tsx`; reuse `fetchQuestions(filters?)`, `fetchQuestionFilters()` from lib/questions

**Interfaces:** renders count summary + filter selects (subject/topic/difficulty) + Table of questions (topic, type, difficulty Badge, grade) limited 50 rows.

- [ ] Steps: failing test (renders row count from mocked fetchQuestions) → implement → green → commit `feat(teacher): question bank browser`

### Task 6: Shell composition + gates + ship

**Files:** Modify `src/pages/TeacherDashboard.tsx` (rewrite), keep route `/teacher`.

- [ ] Step 1: rewrite shell: header "Teacher Command Center" + `TabsList` (Overview/Students/Exams/Bank) + four `TabsContent`s mounting views. Keep `useAuth` gate (role check redirect non-teachers to /dashboard — mirror Admin.tsx pattern).
- [ ] Step 2: full gates `npm run build && npm run test` green (expect ≥232 tests).
- [ ] Step 3: visual smoke on dev: /teacher renders tabs; each tab populated; mobile width 390px usable.
- [ ] Step 4: branch push → merge main → CF deploy → owner eyeballs live.

## Self-review

- Spec §5.2 covered (kit ≈ shadcn subset, House-themed); §5.3 dashboard covered except payments (dropped by owner) — correct.
- Signatures consistent: `cn` path `../../lib/utils` used in every ui file; query key prefix `td-` uniform.
- Placeholders: none — telegram.ts stats shape flagged for verification inside Task 4 step (read-before-write instruction, not TBD).
