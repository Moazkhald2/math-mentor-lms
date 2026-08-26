import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  FilterBar,
  matchesStudentFilters,
  useStudentGradeMap,
  type FilterState,
} from '../../components/ui/filters'

export default function AdminViolations() {
  const [filters, setFilters] = useState<FilterState>({})
  const [typeFilter, setTypeFilter] = useState('')
  const { byUser } = useStudentGradeMap()

  const { data: violations } = useQuery({
    queryKey: ['admin-violations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`*, profile:profiles!user_id(full_name, email), exam:exams(title)`)
        .eq('action', 'violation')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data ?? []
    },
  })

  const actionTypes = useMemo(() => {
    const types = new Set<string>()
    for (const v of violations ?? []) types.add(v.details?.type || 'unknown')
    return [...types].sort()
  }, [violations])

  const filtered = (violations ?? []).filter(v =>
    (!typeFilter || (v.details?.type || 'unknown') === typeFilter) &&
    matchesStudentFilters((v as any).user_id, filters, byUser)
  )

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text text-danger">Cheat Violations</h1>

      <div className="flex flex-wrap items-center gap-2">
        <FilterBar filters={filters} onChange={setFilters} />
        <select
          aria-label="Filter by violation type"
          className="input mb-4 min-w-[130px]"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-text-muted"><tr>
            <th className="px-4 py-3">Student</th><th className="px-4 py-3">Exam</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">When</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">No violations recorded</td></tr>
            )}
            {filtered.map((v: any) => (
              <tr key={v.id} className="text-text hover:bg-danger/5">
                <td className="px-4 py-3">{v.profile?.full_name || v.profile?.email || '—'}</td>
                <td className="px-4 py-3">{v.exam?.title || '—'}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-danger/10 px-2 py-0.5 text-xs text-danger">
                    {v.details?.type || 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-muted">{new Date(v.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
