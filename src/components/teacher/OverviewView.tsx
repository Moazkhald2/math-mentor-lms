import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { matchesStudentFilters, useStudentGradeMap } from '../ui/filters'

interface AttemptRow {
  score: number | null
  total_points: number
  status: string
  started_at: string
  user_id: string
  exam_id: string
  profiles: { full_name: string } | null
  exams: { title: string } | null
}

function useTeacherExams(userId: string) {
  return useQuery({
    queryKey: ['td-overview', userId, 'exams'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exams')
        .select('id,title,is_published,grade')
        .eq('created_by', userId)
      return (data ?? []) as { id: string; title: string; is_published: boolean; grade: number | null }[]
    },
    enabled: !!userId,
  })
}

function useAttempts(userId: string, examIds: string[]) {
  return useQuery({
    queryKey: ['td-overview', userId, 'attempts', examIds.length],
    queryFn: async () => {
      if (!examIds.length) return [] as AttemptRow[]
      const { data } = await supabase
        .from('exam_attempts')
        .select('score,total_points,status,started_at,user_id,exam_id,profiles(full_name),exams(title)')
        .in('exam_id', examIds)
        .order('started_at', { ascending: false })
        .limit(100)
      return (data ?? []) as unknown as AttemptRow[]
    },
    enabled: !!userId && examIds.length > 0,
  })
}

function useViolations(userId: string) {
  return useQuery({
    queryKey: ['td-overview', userId, 'violations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('id,created_at')
        .ilike('action', '%violat%')
        .limit(200)
      return (data ?? []) as { id: string }[]
    },
    enabled: !!userId,
  })
}

const BUCKETS = [
  { label: '0-49', min: 0, max: 49 },
  { label: '50-69', min: 50, max: 69 },
  { label: '70-84', min: 70, max: 84 },
  { label: '85-100', min: 85, max: 100 },
]

export default function OverviewView({ userId, grade }: { userId: string; grade?: number }) {
  const examsQ = useTeacherExams(userId)
  const examsAll = examsQ.data ?? []
  const exams = grade ? examsAll.filter((e) => e.grade === grade) : examsAll
  const attemptsQ = useAttempts(userId, exams.map((e) => e.id))
  const violationsQ = useViolations(userId)
  const { byUser } = useStudentGradeMap()

  // Exam-level grade filter, plus student-level filter for cross-grade classes
  const attempts = (attemptsQ.data ?? []).filter((a) => {
    if (!grade) return true
    if ((a.exams as { grade?: number | null } | null)?.grade != null) {
      return (a.exams as unknown as { grade: number }).grade === grade
    }
    return matchesStudentFilters(a.user_id, { grade }, byUser)
  })
  const completed = attempts.filter((a) => a.status === 'completed' && a.score != null)
  const weekAgo = Date.now() - 7 * 864e5
  const weeklyCount = attempts.filter((a) => new Date(a.started_at).getTime() >= weekAgo).length
  const avg = completed.length
    ? Math.round(completed.reduce((s, a) => s + ((a.score ?? 0) / (a.total_points || 1)) * 100, 0) / completed.length)
    : null
  const distribution = BUCKETS.map((b) => ({
    name: b.label,
    count: completed.filter((a) => {
      const pct = ((a.score ?? 0) / (a.total_points || 1)) * 100
      return pct >= b.min && pct <= b.max
    }).length,
  }))
  const recent = attempts.slice(0, 8)

  function timeAgo(iso: string) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    if (mins < 1440) return `${Math.round(mins / 60)}h ago`
    return `${Math.round(mins / 1440)}d ago`
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>My Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-ink">{exams.length}</p>
            <p className="text-xs text-text-muted">{exams.filter((e) => e.is_published).length} published</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attempts (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-ink">{weeklyCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-ink">{avg != null ? `${avg}%` : '—'}</p>
            <p className="text-xs text-text-muted">{completed.length} graded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Flagged Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-ink">{violationsQ.data?.length ?? 0}</p>
            <p className="text-xs text-text-muted">see /admin/violations</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {completed.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">
              No graded attempts yet — scores will appear here after students submit.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e6e1" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0A9396" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">Nothing yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((a, i) => (
                  <TableRow key={`${a.user_id}-${a.exam_id}-${a.started_at}-${i}`}>
                    <TableCell>{a.profiles?.full_name ?? 'Unknown'}</TableCell>
                    <TableCell>{a.exams?.title ?? '—'}</TableCell>
                    <TableCell>
                      {a.score != null ? `${Math.round(((a.score ?? 0) / (a.total_points || 1)) * 100)}%` : 'in progress'}
                    </TableCell>
                    <TableCell>{timeAgo(a.started_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
