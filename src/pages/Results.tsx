import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ExamAttempt, Answer } from '../types'
import { useAuth } from '../hooks/useAuth'

export default function Results() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: attempt } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*, exam:exams(*)')
        .eq('id', attemptId)
        .single()

      if (error) throw error
      return data as ExamAttempt & { exam: { title: string; passing_score: number } }
    },
    enabled: !!attemptId,
  })

  const { data: answers } = useQuery({
    queryKey: ['attempt-answers', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('answers')
        .select('*, question:questions(*)')
        .eq('attempt_id', attemptId)

      if (error) throw error
      return data as (Answer & { question: { question_text: string; correct_answer: string; explanation: string } })[]
    },
    enabled: !!attemptId,
  })

  if (!user) {
    return (
      <div className="mt-16 text-center">
        <p className="text-text-muted">Sign in to view results</p>
      </div>
    )
  }

  if (!attempt || !answers) {
    return <p className="mt-16 text-center text-text-muted">Loading results...</p>
  }

  const correct = answers.filter((a) => a.is_correct).length
  const total = answers.length

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-text">{attempt.exam.title}</h1>
        <p className="mt-1 text-text-muted">Results</p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-6 text-center">
          <p className="text-3xl font-black text-text">{attempt.score}%</p>
          <p className="text-sm text-text-muted">Score</p>
        </div>
        <div className="rounded-xl border border-accent-green/30 bg-accent-green/5 p-6 text-center">
          <p className="text-3xl font-black text-accent-green">
            {correct}/{total}
          </p>
          <p className="text-sm text-text-muted">Correct</p>
        </div>
        <div className="rounded-xl border border-accent-gold/30 bg-accent-gold/5 p-6 text-center">
          <p className="text-3xl font-black text-text">
            {Math.round((attempt.completed_at ? new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime() : 0) / 60000)}m
          </p>
          <p className="text-sm text-text-muted">Time</p>
        </div>
      </div>

      {attempt.status === 'completed' && (
        <div className={`mb-8 rounded-lg p-4 text-center font-bold ${
          (attempt.score ?? 0) >= attempt.exam.passing_score
            ? 'bg-accent-green/10 text-accent-green'
            : 'bg-danger/10 text-danger'
        }`}>
          {(attempt.score ?? 0) >= attempt.exam.passing_score
            ? '✓ Exam Passed!'
            : '✗ Keep Practicing'
          }
        </div>
      )}

      <h2 className="mb-4 text-xl font-bold text-text">Answers Review</h2>

      <div className="space-y-4">
        {answers.map((a, i) => (
          <div
            key={a.id}
            className={`rounded-lg border p-5 ${
              a.is_correct ? 'border-accent-green/30 bg-accent-green/5' : 'border-danger/30 bg-danger/5'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-text-muted">Q{i + 1}</span>
              <span className={`text-sm font-bold ${a.is_correct ? 'text-accent-green' : 'text-danger'}`}>
                {a.is_correct ? '✓ +' + a.points_earned : '✗ 0'}
              </span>
            </div>

            <p className="mb-3 font-medium text-text">{a.question.question_text}</p>

            <div className="mb-2 text-sm">
              <span className="text-text-muted">Your answer: </span>
              <span className={`font-semibold ${a.is_correct ? 'text-accent-green' : 'text-danger'}`}>
                {a.answer || '(none)'}
              </span>
            </div>

            {!a.is_correct && (
              <div className="mb-2 text-sm">
                <span className="text-text-muted">Correct answer: </span>
                <span className="font-semibold text-accent-green">{a.question.correct_answer}</span>
              </div>
            )}

            {a.question.explanation && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-brand">
                  Explanation
                </summary>
                <p className="mt-2 rounded bg-ink/50 p-3 text-sm leading-relaxed text-text-muted">
                  {a.question.explanation}
                </p>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light"
        >
          Back to Dashboard
        </button>
        <button
          onClick={() => navigate('/exams')}
          className="rounded-lg border border-border px-6 py-2 text-text-muted hover:text-text"
        >
          More Exams
        </button>
      </div>
    </div>
  )
}
