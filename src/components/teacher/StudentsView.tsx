import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

interface StudentRow {
  id: string
  full_name: string
  grade: number | null
}

interface AttemptMini {
  user_id: string
  score: number | null
  total_points: number
  status: string
}

export default function StudentsView() {
  const [search, setSearch] = useState('')

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
        .select('user_id,score,total_points,status')
        .limit(500)
      return (data ?? []) as AttemptMini[]
    },
  })

  const stats = useMemo(() => {
    const byUser = new Map<string, { count: number; graded: number; sumPct: number }>()
    for (const a of attemptsQ.data ?? []) {
      const entry = byUser.get(a.user_id) ?? { count: 0, graded: 0, sumPct: 0 }
      entry.count += 1
      if (a.status === 'completed' && a.score != null) {
        entry.graded += 1
        entry.sumPct += ((a.score ?? 0) / (a.total_points || 1)) * 100
      }
      byUser.set(a.user_id, entry)
    }
    return byUser
  }, [attemptsQ.data])

  const students = (studentsQ.data ?? []).filter((s) =>
    s.full_name.toLowerCase().includes(search.trim().toLowerCase()),
  )

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
          {students.map((s) => {
            const st = stats.get(s.id)
            const avg =
              st && st.graded > 0 ? `${Math.round(st.sumPct / st.graded)}%` : null
            return (
              <TableRow key={s.id}>
                <TableCell>{s.full_name}</TableCell>
                <TableCell>{s.grade ?? '—'}</TableCell>
                <TableCell>{st ? `${st.count} attempts` : 'No attempts yet'}</TableCell>
                <TableCell>{avg ?? '—'}</TableCell>
              </TableRow>
            )
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
