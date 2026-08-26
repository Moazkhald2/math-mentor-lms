import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Question } from '../../types'
import {
  FilterBar,
  attemptResult,
  matchesStudentFilters,
  useStudentGradeMap,
  type FilterState,
} from '../../components/ui/filters'

function answerDisplay(answer: string, question: Question): string {
  if (!answer) return '(none)'
  if (question.type === 'multiple_choice' && question.options.length > 0) {
    const idx = parseInt(answer, 10)
    if (!isNaN(idx) && idx >= 0 && idx < question.options.length) {
      return question.options[idx]
    }
  }
  return answer
}

export default function AdminAttempts() {
  const [statusFilter, setStatusFilter] = useState('')
  const [filters, setFilters] = useState<FilterState>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const { byUser } = useStudentGradeMap()

  const { data: attempts } = useQuery({
    queryKey: ['admin-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*, profiles!inner(email, full_name, grade), exams!inner(title, type, passing_score)')
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
        .select('*, questions!inner(question_text, correct_answer, explanation, options, type)')
        .eq('attempt_id', expanded!)
      if (error) throw error
      return data
    },
    enabled: !!expanded,
  })

  const filtered = (attempts ?? []).filter((a: any) => {
    if (statusFilter && a.status !== statusFilter) return false
    if (!matchesStudentFilters(a.user_id, filters, byUser)) return false
    if (filters.status) {
      const result = attemptResult(a.score, a.total_points || 100, a.exams?.passing_score ?? 60)
      if (result !== filters.status) return false
    }
    return true
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Attempts</h1>
      <FilterBar filters={filters} onChange={setFilters} showStatus />
      <div className="mb-4 flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-surface px-4 py-2 text-ink">
          <option value="">All status</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="abandoned">Abandoned</option>
        </select>
      </div>
      <div className="space-y-2">
        {filtered.map((a: any) => (
          <div key={a.id} className="rounded-xl border border-border bg-surface">
            <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="flex w-full items-center justify-between p-4 text-left">
              <div className="flex items-center gap-4">
                <span className="font-medium text-text">{a.profiles?.full_name || a.profiles?.email}</span>
                <span className="text-sm text-text-muted">Grade {a.profiles?.grade ?? '-'}</span>
                <span className="text-text-muted">{a.exams?.title}</span>
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
                    <p className="text-sm mt-1">Answer: <span className={ans.is_correct ? 'text-accent-green' : 'text-danger'}>{answerDisplay(ans.answer, ans.questions)}</span></p>
                    {!ans.is_correct && <p className="text-sm text-accent-green">Correct: {answerDisplay(ans.questions?.correct_answer, ans.questions)}</p>}
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
