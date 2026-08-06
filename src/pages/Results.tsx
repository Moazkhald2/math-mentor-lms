import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ExamAttempt, Answer, Question } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useBestScore } from '../hooks/useBestScore'
import LatexRenderer from '../components/LatexRenderer'
import BookmarkButton from '../components/BookmarkButton'
import FeedbackButton from '../components/FeedbackButton'

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
      return data as ExamAttempt & { exam: { title: string; passing_score: number; max_attempts: number } }
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
      return data as (Answer & { question: Question })[]
    },
    enabled: !!attemptId,
  })

  const bestScore = useBestScore(attempt?.exam_id, attempt?.exam?.max_attempts)
  const best = bestScore.data?.best ?? 0
  const left = bestScore.data?.left ?? 0

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
        <div className="rounded-xl border border-brand/40 bg-surface p-6 text-center">
          <p className="text-3xl font-black text-text">{attempt.score}%</p>
          <p className="mt-1 text-sm text-text-muted">Score</p>
        </div>
        <div className="rounded-xl border border-accent-green/40 bg-surface p-6 text-center">
          <span className="inline-block rounded bg-accent-green/20 px-2 py-0.5 text-xs font-semibold text-accent-green">Correct</span>
          <p className="mt-2 text-3xl font-black text-accent-green">{correct}/{total}</p>
        </div>
        <div className="rounded-xl border border-accent-gold/40 bg-surface p-6 text-center">
          <p className="text-3xl font-black text-text">
            {Math.round((attempt.completed_at ? new Date(attempt.completed_at).getTime() - new Date(attempt.started_at).getTime() : 0) / 60000)}m
          </p>
          <p className="mt-1 text-sm text-text-muted">Time</p>
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

      {bestScore.data && (
        <div className="mb-8 rounded-lg border border-brand/30 bg-surface p-4 text-center">
          <span className="text-sm text-text-muted">Best score across attempts: </span>
          <span className="font-bold text-brand">{best}%</span>
          {left > 0 && (
            <span className="ml-3 text-sm text-text-muted">
              ({left} attempt{left === 1 ? '' : 's'} left)
            </span>
          )}
          {left === 0 && (
            <p className="mt-2 text-sm font-semibold text-danger">
              You've reached the maximum of {attempt.exam.max_attempts} attempts; your best score is {best}%
            </p>
          )}
        </div>
      )}

      <h2 className="mb-4 text-xl font-bold text-text">Answers Review</h2>

      <div className="space-y-4">
        {answers.map((a, i) => (
          <div
            key={a.id}
            className={`rounded-lg border p-5 ${
              a.is_correct ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-text-muted">Q{i + 1}</span>
              <div className="flex items-center gap-2">
                <BookmarkButton questionId={a.question.id} />
                <FeedbackButton questionId={a.question.id} />
                <span className={`text-sm font-bold ${a.is_correct ? 'text-accent-green' : 'text-danger'}`}>
                  {a.is_correct ? '✓ +' + a.points_earned : '✗ 0'}
                </span>
              </div>
            </div>

            <div className="mb-3 font-medium text-text">
              <LatexRenderer content={a.question.question_text} />
            </div>

            {a.question.options.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {a.question.options.map((opt, oi) => {
                  const optIdx = String(oi)
                  const isSelected = a.question.type === 'multiple_choice' ? optIdx === a.answer : opt === a.answer
                  const isCorrectOpt = a.question.type === 'multiple_choice' ? optIdx === a.question.correct_answer : opt === a.question.correct_answer
                  let className = 'rounded-lg border px-3 py-1.5 text-sm '
                  if (isCorrectOpt) className += 'border-accent-green bg-accent-green/10 text-accent-green'
                  else if (isSelected && !a.is_correct) className += 'border-danger bg-danger/10 text-danger'
                  else className += 'border-border text-text-muted'
                  return (
                    <div key={oi} className={className}>
                      <LatexRenderer content={opt} />
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mb-2 text-sm">
              <span className="text-text-muted">Your answer: </span>
              <span className={`font-semibold ${a.is_correct ? 'text-accent-green' : 'text-danger'}`}>
                <LatexRenderer content={answerDisplay(a.answer, a.question)} inline />
              </span>
            </div>

            {!a.is_correct && (
              <div className="mb-2 text-sm">
                <span className="text-text-muted">Correct answer: </span>
                <span className="font-semibold text-accent-green">
                  <LatexRenderer content={answerDisplay(a.question.correct_answer, a.question)} inline />
                </span>
              </div>
            )}

            {a.question.explanation && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-brand">
                  Explanation
                </summary>
                <div className="mt-2 rounded bg-ink/50 p-3 text-sm leading-relaxed text-text-muted">
                  <LatexRenderer content={a.question.explanation} />
                </div>
              </details>
            )}

            {a.question.common_mistakes.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-accent-gold hover:text-warning">
                  Common Mistakes
                </summary>
                <div className="mt-2 space-y-3">
                  {a.question.common_mistakes.map((cm, ci) => (
                    <div key={ci} className="rounded-lg border border-accent-gold/20 bg-accent-gold/5 p-3">
                      <p className="mb-1 text-sm">
                        <span className="font-semibold text-danger">✗ <LatexRenderer content={cm.mistake} /></span>
                      </p>
                      <p className="mb-1 text-xs text-text-muted">Why: <LatexRenderer content={cm.why} inline /></p>
                      <p className="text-sm text-accent-green">✓ Correct: <LatexRenderer content={cm.correct} /></p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        {left > 0 && (
          <Link
            to={`/exam/${attempt.exam_id}`}
            className="text-brand underline hover:text-brand-light"
          >
            Take another attempt
          </Link>
        )}
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
