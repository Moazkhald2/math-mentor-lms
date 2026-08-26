import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { fetchClasses } from '../../lib/classes'

export interface FilterState {
  grade?: number
  classCode?: string
  status?: 'passed' | 'failed'
}

export const GRADES = [4, 5, 6, 7, 8, 9, 10] as const

const selectCls =
  'input min-w-[130px] rounded-lg border border-border bg-surface px-3 py-1.5 text-sm'

export function useStudentGradeMap() {
  const q = useQuery({
    queryKey: ['filter-student-map'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, grade, class_code')
        .eq('role', 'student')
      return (data ?? []) as { id: string; full_name: string; grade: number | null; class_code: string | null }[]
    },
  })
  const byUser = useMemo(() => {
    const m = new Map<string, { grade: number | null; class_code: string | null; full_name: string }>()
    for (const p of q.data ?? []) m.set(p.id, p)
    return m
  }, [q.data])
  return { byUser, loading: q.isLoading }
}

/** True if a row belonging to userId passes the active student filters. */
export function matchesStudentFilters(
  userId: string | undefined,
  f: FilterState,
  byUser: ReturnType<typeof useStudentGradeMap>['byUser'],
): boolean {
  if (!f.grade && !f.classCode && !f.status) return true
  if (!userId) return !f.grade && !f.classCode
  const p = byUser.get(userId)
  if (!p) return false
  if (f.grade && p.grade !== f.grade) return false
  if (f.classCode && (p.class_code ?? '') !== f.classCode) return false
  return true
}

interface BarProps {
  filters: FilterState
  onChange: (next: FilterState) => void
  showStatus?: boolean
  statusOptions?: { value: string; label: string }[]
  className?: string
}

/** One consistent filter bar: Grade → Class → (optional status) → Clear all. */
export function FilterBar({ filters, onChange, showStatus, statusOptions, className = '' }: BarProps) {
  const classesQ = useQuery({
    queryKey: ['filter-classes'],
    queryFn: () => fetchClasses(),
    staleTime: 60_000,
  })
  const classOpts = ((classesQ.data ?? []) as { id: string; name: string; code?: string; grade?: number | null }[]).filter(
    (c) => !filters.grade || c.grade === filters.grade,
  )

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-2 ${className}`}>
      <select
        aria-label="Filter by grade"
        className={selectCls}
        value={filters.grade ?? ''}
        onChange={(e) => onChange({ ...filters, grade: e.target.value ? Number(e.target.value) : undefined, classCode: undefined })}
      >
        <option value="">All grades</option>
        {GRADES.map((g) => (
          <option key={g} value={g}>Grade {g}</option>
        ))}
      </select>

      <select
        aria-label="Filter by class"
        className={selectCls}
        value={filters.classCode ?? ''}
        disabled={!filters.grade && !(classesQ.data ?? []).length}
        onChange={(e) => onChange({ ...filters, classCode: e.target.value || undefined })}
      >
        <option value="">All classes</option>
        {classOpts.map((c) => (
          <option key={c.id} value={c.code ?? c.name}>{c.name}{c.grade ? ` — G${c.grade}` : ''}</option>
        ))}
      </select>

      {showStatus && (
        <select
          aria-label="Filter by result"
          className={selectCls}
          value={filters.status ?? ''}
          onChange={(e) => onChange({ ...filters, status: (e.target.value || undefined) as FilterState['status'] })}
        >
          <option value="">All results</option>
          {(statusOptions ?? [
            { value: 'passed', label: 'Passed' },
            { value: 'failed', label: 'Failed' },
          ]).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {(filters.grade || filters.classCode || filters.status) && (
        <button
          onClick={() => onChange({})}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-brand hover:text-brand"
        >
          ✕ Clear all filters
        </button>
      )}
    </div>
  )
}

/** Result pass/fail evaluation against the exam's passing score. */
export function attemptResult(score: number | null, totalPoints: number, passingScore: number): 'passed' | 'failed' | null {
  if (score == null) return null
  const pct = (score / (totalPoints || 1)) * 100
  return pct >= passingScore ? 'passed' : 'failed'
}
