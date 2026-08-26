import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

interface ExamRow {
  id: string
  title: string
  grade: number | null
  type: string
  is_published: boolean
  created_by: string
}

interface AttemptMini {
  exam_id: string
  score: number | null
  total_points: number
  status: string
}

export function buildExamReport(exam: ExamRow, stats: { count: number; avg: number | null; best: number | null }) {
  const lines = [
    `📘 ${exam.title}`,
    exam.grade ? `Grade ${exam.grade}` : 'All grades',
    `Attempts: ${stats.count}`,
  ]
  if (stats.avg != null) {
    lines.push(`Average: ${stats.avg}%`)
    lines.push(`Best: ${stats.best ?? '—'}%`)
    lines.push(stats.avg >= 60 ? '✅ Class average is passing' : '⚠️ Class average below passing')
  }
  return lines.join('\n')
}

export default function ExamsView({ userId }: { userId: string }) {
  const queryClient = useQueryClient()

  const examsQ = useQuery({
    queryKey: ['td-my-exams', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('exams')
        .select('id,title,grade,type,is_published,created_by')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
      return (data ?? []) as ExamRow[]
    },
    enabled: !!userId,
  })

  const attemptsQ = useQuery({
    queryKey: ['td-my-exams', 'attempts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exam_attempts')
        .select('exam_id,score,total_points,status')
        .limit(500)
      return (data ?? []) as AttemptMini[]
    },
  })

  const togglePublish = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      await supabase.from('exams').update({ is_published: next }).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['td-my-exams'] }),
  })

  const statsByExam = useMemo(() => {
    const map = new Map<string, { count: number; avg: number | null; best: number | null }>()
    for (const e of examsQ.data ?? []) map.set(e.id, { count: 0, avg: null, best: null })
    for (const a of attemptsQ.data ?? []) {
      const s = map.get(a.exam_id)
      if (!s) continue
      s.count += 1
      if (a.status === 'completed' && a.score != null) {
        const pct = Math.round(((a.score ?? 0) / (a.total_points || 1)) * 100)
        const graded = (map.get(a.exam_id)?.count ?? 0)
        const prevAvg = s.avg
        s.avg =
          prevAvg == null
            ? pct
            : Math.round((prevAvg * (graded - 1) + pct) / graded)
        s.best = s.best == null ? pct : Math.max(s.best, pct)
      }
    }
    return map
  }, [examsQ.data, attemptsQ.data])

  const exams = examsQ.data ?? []

  async function copyReport(exam: ExamRow) {
    const stats = statsByExam.get(exam.id) ?? { count: 0, avg: null, best: null }
    try {
      await navigator.clipboard.writeText(buildExamReport(exam, stats))
    } catch {
      window.prompt('Copy this report:', buildExamReport(exam, stats))
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>My Exams</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {exams.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">
              No exams yet — create one under Admin → Exams.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts / Avg</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((e) => {
                  const s = statsByExam.get(e.id) ?? { count: 0, avg: null, best: null }
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell>{e.grade ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={e.is_published ? 'success' : 'outline'}>
                          {e.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.count} · {s.avg != null ? `${s.avg}%` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-paper"
                            onClick={() => togglePublish.mutate({ id: e.id, next: !e.is_published })}
                          >
                            {e.is_published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-paper"
                            onClick={() => void copyReport(e)}
                          >
                            Copy report
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
