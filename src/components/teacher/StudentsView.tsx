import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

interface StudentRow {
  id: string
  full_name: string
  grade: number | null
}

interface AttemptRow {
  user_id: string
  exam_id: string
  score: number | null
  total_points: number
  status: string
  started_at: string
  exams?: { title: string } | null
}

export default function StudentsView({ grade }: { grade?: number }) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const studentsQ = useQuery({
    queryKey: ['td-students'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,grade')
        .eq('role', 'student')
        .order('full_name')
      return (data ?? []) as StudentRow[]
    },
  })

  const attemptsQ = useQuery({
    queryKey: ['td-students', 'attempts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exam_attempts')
        .select('user_id,exam_id,score,total_points,status,started_at,exams(title)')
        .order('started_at', { ascending: false })
        .limit(500)
      return (data ?? []) as unknown as AttemptRow[]
    },
  })

  const rows = useMemo(() => attemptsQ.data ?? [], [attemptsQ.data])

  const stats = useMemo(() => {
    const byUser = new Map<string, { count: number; graded: number; sumPct: number; best: number; lastActive: string }>()
    for (const a of rows) {
      const e = byUser.get(a.user_id) ?? { count: 0, graded: 0, sumPct: 0, best: 0, lastActive: a.started_at }
      e.count += 1
      if (a.started_at > e.lastActive) e.lastActive = a.started_at
      if (a.status === 'completed' && a.score != null) {
        e.graded += 1
        const pct = ((a.score ?? 0) / (a.total_points || 1)) * 100
        e.sumPct += pct
        e.best = Math.max(e.best, Math.round(pct))
      }
      byUser.set(a.user_id, e)
    }
    return byUser
  }, [rows])

  const students = (studentsQ.data ?? [])
    .filter((s) => !grade || s.grade === grade)
    .filter((s) => s.full_name.toLowerCase().includes(search.trim().toLowerCase()))

  function daysSince(iso: string): string {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.round(mins / 60)}h ago`
    return `${Math.round(mins / 1440)}d ago`
  }

  function talkingPoints(studentId: string, name: string): string[] {
    const theirs = rows.filter((a) => a.user_id === studentId)
    if (theirs.length === 0) return [`${name} hasn't attempted anything yet — encourage a first practice sheet.`]
    const completed = theirs.filter((a) => a.status === 'completed' && a.score != null)
    const points: string[] = []
    if (completed.length > 0) {
      const avg = Math.round(completed.reduce((s, a) => s + ((a.score ?? 0) / (a.total_points || 1)) * 100, 0) / completed.length)
      points.push(`Average score is ${avg}% across ${completed.length} graded ${completed.length === 1 ? 'exam' : 'exams'}.`)
      const best = completed.reduce((b, a) => (((a.score ?? 0) / (a.total_points || 1)) > ((b.score ?? 0) / (b.total_points || 1)) ? a : b))
      points.push(`Best result: ${(best.exams?.title ?? 'an exam')} at ${Math.round(((best.score ?? 0) / (best.total_points || 1)) * 100)}%.`)
      const weakest = completed.reduce((w, a) => (((a.score ?? 0) / (a.total_points || 1)) < ((w.score ?? 0) / (w.total_points || 1)) ? a : w))
      const wpct = Math.round(((weakest.score ?? 0) / (weakest.total_points || 1)) * 100)
      if (wpct < 70) points.push(`Focus area: ${(weakest.exams?.title ?? 'recent work')} scored ${wpct}% — more practice there will help.`)
    } else {
      points.push('No graded results yet — consistency will build the picture.')
    }
    const last = daysSince(theirs[0].started_at)
    points.push(`Last activity was ${last}.`)
    return points
  }

  return (
    <div className="grid gap-4">
      <input
        className="input"
        type="search"
        placeholder="Search students by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Attempts</TableHead>
            <TableHead>Avg Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.flatMap((s) => {
            const st = stats.get(s.id)
            const avg = st && st.graded > 0 ? `${Math.round(st.sumPct / st.graded)}%` : null
            const open = expandedId === s.id
            const mainRow = (
              <TableRow
                key={s.id}
                onClick={() => setExpandedId(open ? null : s.id)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium">
                  <span className="mr-2 text-brand">{open ? '▾' : '▸'}</span>
                  {s.full_name}
                </TableCell>
                <TableCell>{s.grade ?? '—'}</TableCell>
                <TableCell>{st ? `${st.count} attempts` : 'No attempts yet'}</TableCell>
                <TableCell>{avg ?? '—'}</TableCell>
              </TableRow>
            )
            if (!open) return [mainRow]
            const detailRow = (
              <TableRow key={`${s.id}-detail`}>
                <TableCell colSpan={4} className="bg-paper">
                  <div className="grid gap-4 py-1 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Talking points for parents</p>
                      <ul className="list-disc space-y-1.5 pl-4 text-sm text-ink">
                        {talkingPoints(s.id, s.full_name).map((tp, i) => (
                          <li key={i}>{tp}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Recent results</p>
                      <div className="space-y-1.5">
                        {rows.filter((a) => a.user_id === s.id).slice(0, 6).map((a, i) => (
                          <div key={`${a.exam_id}-${i}`} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
                            <span className="truncate pr-2">{a.exams?.title ?? 'Exam'}</span>
                            <span className={a.status === 'completed' ? 'font-semibold text-ink' : 'text-text-muted'}>
                              {a.status === 'completed' && a.score != null
                                ? `${Math.round(((a.score ?? 0) / (a.total_points || 1)) * 100)}%`
                                : a.status === 'in_progress' ? 'In progress' : '—'}
                            </span>
                          </div>
                        ))}
                        {rows.every((a) => a.user_id !== s.id) && (
                          <p className="text-sm text-text-muted">Nothing yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )
            return [mainRow, detailRow]
          })}
          {students.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-text-muted">
                {studentsQ.data?.length ? 'No students match your search.' : 'No students registered yet.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
