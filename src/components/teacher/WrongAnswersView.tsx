import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { aggregateCommonWrongAnswers, type RawWrongAnswerRow } from '../../lib/wrongAnswers'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import LatexRenderer from '../LatexRenderer'
import DifficultyBadge from '../DifficultyBadge'

interface WrongAnswersViewProps {
  grade?: number
  groupStudentIds?: Set<string>
  studentId?: string
}

export default function WrongAnswersView({
  grade,
  groupStudentIds,
  studentId,
}: WrongAnswersViewProps) {
  const [selectedExamId, setSelectedExamId] = useState('')

  const wrongAnswersQ = useQuery({
    queryKey: ['td-wrong-answers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('answers')
        .select(
          'id, question_id, answer, is_correct, exam_attempts!inner(user_id, exam_id, profiles(full_name, email, grade), exams(id, title, grade, type)), questions!inner(id, question_text, topic, subject, difficulty, type, options, correct_answer)'
        )
        .eq('is_correct', false)
        .limit(1000)
      if (error) throw error
      return (data ?? []) as unknown as RawWrongAnswerRow[]
    },
  })

  const rawRows = wrongAnswersQ.data ?? []

  const examOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rawRows) {
      const ex = r.exam_attempts?.exams
      if (!ex) continue
      if (grade != null && ex.grade != null && ex.grade !== grade) continue
      map.set(ex.id, ex.title)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rawRows, grade])

  const summaries = useMemo(
    () =>
      aggregateCommonWrongAnswers(rawRows, {
        grade,
        groupStudentIds,
        studentId,
        examId: selectedExamId || undefined,
      }),
    [rawRows, grade, groupStudentIds, studentId, selectedExamId]
  )

  const totalWrongResponses = useMemo(
    () => summaries.reduce((acc, s) => acc + s.totalWrong, 0),
    [summaries]
  )

  const topMissedTopic = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of summaries) {
      const key = s.topic || 'General'
      counts.set(key, (counts.get(key) ?? 0) + s.totalWrong)
    }
    let best: { topic: string; count: number } | null = null
    for (const [topic, count] of counts.entries()) {
      if (!best || count > best.count) best = { topic, count }
    }
    return best
  }, [summaries])

  return (
    <div className="space-y-4">
      {/* Header Filter + KPI Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Questions Missed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-ink">{summaries.length}</p>
            <p className="text-xs text-text-muted">ranked by mistake frequency</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Wrong Answers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-danger">{totalWrongResponses}</p>
            <p className="text-xs text-text-muted">matching active filters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Reteach Topic</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-lg font-black text-brand">
              {topMissedTopic ? topMissedTopic.topic : '—'}
            </p>
            <p className="text-xs text-text-muted">
              {topMissedTopic ? `${topMissedTopic.count} wrong answers` : 'No mistakes logged yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Exam/Sheet filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5">
        <div>
          <h2 className="text-sm font-bold text-ink">Most Common Wrong Answers</h2>
          <p className="text-xs text-text-muted">
            Grouped student mistakes per question — use this right after monthly exams to target misconceptions.
          </p>
        </div>
        <select
          aria-label="Filter wrong answers by exam"
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink"
        >
          <option value="">All exams &amp; sheets</option>
          {examOptions.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      </div>

      {wrongAnswersQ.isLoading && (
        <p className="py-6 text-center text-sm text-text-muted">Analyzing logged wrong answers...</p>
      )}

      {!wrongAnswersQ.isLoading && summaries.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-text-muted">
            No wrong answers found for the selected Grade / Group / Student filters yet.
          </CardContent>
        </Card>
      )}

      {/* Ranked Question Mistake Cards */}
      <div className="space-y-3">
        {summaries.map((item) => (
          <Card key={item.questionId}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-bold text-danger">
                    {item.totalWrong} wrong
                  </span>
                  <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                    {item.topic || item.subject}
                  </span>
                  <DifficultyBadge level={item.difficulty} />
                  {item.examTitles.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 px-2.5 py-1 text-xs font-semibold text-accent-green">
                  Correct: <LatexRenderer content={item.correctAnswerDisplay} inline />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-alt/40 p-3 text-sm font-medium text-ink">
                <LatexRenderer content={item.questionText} />
              </div>

              <div className="space-y-2">
                {item.buckets.slice(0, 5).map((bucket) => (
                  <div key={bucket.key} className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-ink">
                        Wrong answer:{' '}
                        <span className="font-mono text-danger">
                          <LatexRenderer content={bucket.displayAnswer} inline />
                        </span>
                      </span>
                      <span className="font-semibold text-text-muted">
                        {bucket.count} student{bucket.count === 1 ? '' : 's'} ({bucket.percentOfWrong}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-light">
                      <div
                        className="h-2 rounded-full bg-danger/70"
                        style={{ width: `${Math.max(8, bucket.percentOfWrong)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Students: {bucket.students.slice(0, 6).join(', ')}
                      {bucket.students.length > 6 ? ` +${bucket.students.length - 6} more` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
