import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { fetchExamQuestions } from '../lib/exams'
import AntiCheatGuard from '../components/AntiCheatGuard'
import DifficultyBadge from '../components/DifficultyBadge'
import { useActivityLogger } from '../hooks/useActivityLogger'
import type { Question } from '../types'

export default function Exam() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const { log } = useActivityLogger(id)

  const { data: questions, isLoading } = useQuery({
    queryKey: ['exam-questions', id],
    queryFn: () => fetchExamQuestions(id!),
    enabled: !!id,
  })

  const current = questions?.[currentIndex]
  const total = questions?.length ?? 0
  const answered = Object.keys(answers).length

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = useCallback(() => {
    if (!questions) return
    let correct = 0
    questions.forEach((eq) => {
      if (answers[eq.question_id] === eq.question.correct_answer) correct++
    })
    const pct = Math.round((correct / questions.length) * 100)
    setScore(pct)
    setSubmitted(true)
  }, [questions, answers])

  if (isLoading) {
    return <p className="mt-16 text-center text-text-muted">Loading exam...</p>
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="mt-16 text-center">
        <p className="text-text-muted">Exam not found or has no questions.</p>
      </div>
    )
  }

  if (submitted) {
    const passed = score >= (questions[0]?.points ?? 1) * 100
    return (
      <div className="mx-auto mt-16 max-w-lg text-center">
        <div className={`mb-6 text-6xl ${passed ? 'text-accent-green' : 'text-danger'}`}>
          {passed ? '✓' : '✗'}
        </div>
        <h1 className="mb-2 text-3xl font-black text-text">
          {passed ? 'Exam Passed!' : 'Keep Practicing'}
        </h1>
        <p className="mb-2 text-5xl font-black text-brand">{score}%</p>
        <p className="mb-8 text-text-muted">
          {answered} of {total} answered
        </p>
        <div className="space-y-4 text-left">
          {questions.map((eq, i) => {
            const userAnswer = answers[eq.question_id]
            const correct = userAnswer === eq.question.correct_answer
            return (
              <div
                key={eq.question_id}
                className={`rounded-lg border p-4 ${
                  correct ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-text-muted">Q{i + 1}</span>
                  <span className={`text-sm font-bold ${correct ? 'text-accent-green' : 'text-danger'}`}>
                    {correct ? '✓ Correct' : '✗ Wrong'}
                  </span>
                </div>
                <p className="mb-2 text-sm font-medium text-text">{eq.question.question_text}</p>
                <p className="text-xs text-text-muted">
                  Your answer: <span className="font-semibold text-text">{userAnswer}</span>
                  {!correct && (
                    <>
                      {' · '}Correct: <span className="font-semibold text-accent-green">{eq.question.correct_answer}</span>
                    </>
                  )}
                </p>
              </div>
            )
          })}
        </div>
        <button
          onClick={() => navigate('/exams')}
          className="mt-8 rounded-lg bg-brand px-8 py-3 font-semibold text-white hover:bg-brand-light"
        >
          Back to Exams
        </button>
      </div>
    )
  }

  return (
    <AntiCheatGuard
      maxWarnings={3}
      durationMinutes={60}
      onTimeUp={handleSubmit}
      onDisqualified={handleSubmit}
      onViolation={(type) => log('violation', { type })}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm text-text-muted">
            {answered}/{total} answered
          </span>
          <div className="h-2 flex-1 mx-4 rounded-full bg-surface-light">
            <div
              className="h-2 rounded-full bg-brand transition-all"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={answered < total}
            className="rounded-lg bg-accent-green px-4 py-2 text-sm font-semibold text-white hover:bg-accent-green/80 disabled:opacity-50"
          >
            Submit
          </button>
        </div>

        {current && (
          <QuestionView
            question={current.question}
            index={currentIndex}
            total={total}
            selected={answers[current.question_id]}
            onAnswer={(a) => handleAnswer(current.question_id, a)}
            onNext={() => setCurrentIndex((i) => Math.min(i + 1, total - 1))}
            onPrev={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
          />
        )}
      </div>
    </AntiCheatGuard>
  )
}

function QuestionView({
  question,
  index,
  total,
  selected,
  onAnswer,
  onNext,
  onPrev,
}: {
  question: Question
  index: number
  total: number
  selected?: string
  onAnswer: (answer: string) => void
  onNext: () => void
  onPrev: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm font-semibold text-brand">
          Q{index + 1} / {total}
        </span>
        <DifficultyBadge level={question.difficulty} />
      </div>

      <p className="mb-8 text-lg font-medium leading-relaxed text-text">
        {question.question_text}
      </p>

      <div className="space-y-3">
        {question.type === 'multiple_choice' &&
          question.options.map((opt, i) => {
            const val = String(i)
            return (
              <button
                key={i}
                onClick={() => onAnswer(val)}
                className={`w-full rounded-lg border px-5 py-3 text-left transition ${
                  selected === val
                    ? 'border-brand bg-brand/10 text-text'
                    : 'border-border text-text-muted hover:border-brand/50 hover:text-text'
                }`}
              >
                <span className="mr-3 font-mono text-sm text-text-muted">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            )
          })}

        {question.type === 'true_false' &&
          ['True', 'False'].map((opt) => (
            <button
              key={opt}
              onClick={() => onAnswer(opt.toLowerCase())}
              className={`w-full rounded-lg border px-5 py-3 text-left transition ${
                selected === opt.toLowerCase()
                  ? 'border-brand bg-brand/10 text-text'
                  : 'border-border text-text-muted hover:border-brand/50 hover:text-text'
              }`}
            >
              {opt}
            </button>
          ))}

        {question.type === 'short_answer' && (
          <input
            type="text"
            value={selected ?? ''}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="w-full rounded-lg border border-border bg-bg px-5 py-3 text-text outline-none focus:border-brand"
          />
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="rounded-lg border border-border px-5 py-2 text-sm text-text-muted hover:text-text disabled:opacity-30"
        >
          ← Previous
        </button>
        <button
          onClick={onNext}
          disabled={index === total - 1}
          className="rounded-lg border border-border px-5 py-2 text-sm text-text-muted hover:text-text disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
