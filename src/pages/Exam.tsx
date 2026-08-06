import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { fetchExamQuestions, fetchVariantPool, startAttempt, submitAnswer, completeAttempt, saveAnswer, fetchStudentAttempts, cooldownRemainingMs, getBestScore } from '../lib/exams'
import { supabase } from '../lib/supabase'
import { seededShuffle, shuffleMultipleChoice } from '../lib/shuffle'
import { resolveVariant } from '../lib/variants'
import AntiCheatGuard from '../components/AntiCheatGuard'
import Watermark from '../components/Watermark'
import DifficultyBadge from '../components/DifficultyBadge'
import { useActivityLogger } from '../hooks/useActivityLogger'
import LatexRenderer from '../components/LatexRenderer'
import type { Question, Exam, ExamQuestion } from '../types'

type ShuffledQuestion = ExamQuestion & {
  question: Question & { options: string[]; correct_answer: string }
}

export default function Exam() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { log } = useActivityLogger(id)
  const queryClient = useQueryClient()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [attemptSeed, setAttemptSeed] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  const { data: exam } = useQuery({
    queryKey: ['exam', id, user?.id],
    queryFn: async () => {
      const [examRes, profileRes] = await Promise.all([
        supabase.from('exams').select('*').eq('id', id!).single(),
        user ? supabase.from('profiles').select('grade').eq('id', user.id).single() : Promise.resolve({ data: null }),
      ])
      if (examRes.error) throw examRes.error
      const e = examRes.data as Exam
      if (!e.is_published) throw new Error('Exam not available')
      const now = new Date()
      if (e.starts_at && now < new Date(e.starts_at)) throw new Error('This exam has not started yet')
      if (e.ends_at && now > new Date(e.ends_at)) throw new Error('This exam has ended')
      const grade = (profileRes.data as { grade: number } | null)?.grade
      if (grade && e.grade && e.grade !== grade) throw new Error('This exam is not available for your grade')
      return e
    },
    enabled: !!id,
  })

  const { data: rawQuestions, isLoading } = useQuery({
    queryKey: ['exam-questions', id],
    queryFn: () => fetchExamQuestions(id!),
    enabled: !!id,
  })

  const { data: variantPool = [] } = useQuery({
    queryKey: ['exam-variant-pool', id],
    queryFn: () => {
      const groupIds = [...new Set((rawQuestions ?? [])
        .map(eq => eq.question.variant_group_id)
        .filter((g): g is string => !!g))]
      return fetchVariantPool(groupIds)
    },
    enabled: !!rawQuestions,
  })

  const { data: pastAttempts = [], isPending: attemptsLoading } = useQuery({
    queryKey: ['my-exam-attempts', id],
    queryFn: () => user ? fetchStudentAttempts(id!, user.id) : Promise.resolve([]),
    enabled: !!id && !!user,
  })
  const completedCount = pastAttempts.filter(a => a.status === 'completed').length
  const cd = exam ? cooldownRemainingMs(exam, pastAttempts) : 0
  const gate = exam
    ? (completedCount >= (exam.max_attempts ?? 3) ? 'no_attempts' : (cd > 0 ? 'cooldown' : null))
    : null

  useEffect(() => {
    if (!user || !id || startedRef.current || !exam || attemptsLoading) return
    if (gate) {
      startedRef.current = true
      return
    }
    startedRef.current = true
    log('exam_started', { exam_id: id })
    startAttempt(id, user.id).then(a => {
      setAttemptId(a.id)
      setAttemptSeed(a.seed ?? null)
    }).catch(e => setError(e.message))
  }, [user, id, exam, gate, attemptsLoading, log])

  const questions = useMemo<ShuffledQuestion[] | undefined>(() => {
    if (!rawQuestions) return undefined
    const seed = (attemptSeed ?? id) || 'default'
    const baseShuffle = exam?.shuffle_questions
      ? seededShuffle(rawQuestions, seed + '_questions')
      : [...rawQuestions]
    const resolved = baseShuffle.map(eq => {
      const variant = resolveVariant(eq.question, seed, variantPool)
      const question = { ...variant }
      if (question.type === 'multiple_choice' && question.options.length > 0) {
        const { options, correctAnswer } = shuffleMultipleChoice(
          question.options, question.correct_answer, seed + question.id
        )
        question.options = options
        question.correct_answer = correctAnswer
      }
      return { ...eq, question }
    })
    return resolved
  }, [rawQuestions, id, attemptSeed, exam?.shuffle_questions, variantPool])

  const current = questions?.[currentIndex]
  const total = questions?.length ?? 0
  const answered = Object.keys(answers).length

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSave = useCallback(async () => {
    if (!attemptId || saving || answered === 0) return
    setSaving(true)
    try {
      for (const [qid, ans] of Object.entries(answers)) {
        await saveAnswer(attemptId, qid, ans)
      }
      log('exam_saved', { answered })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [attemptId, saving, answered, answers, log])

  const handleSubmit = useCallback(async () => {
    if (!attemptId || !questions || submitting) return
    setSubmitting(true)
    try {
      let correct = 0
      let totalPoints = 0
      let earnedPoints = 0
      for (const eq of questions) {
        const points = eq.points ?? 1
        totalPoints += points
        const userAns = answers[eq.question_id] ?? ''
        const isCorrect = eq.question.type === 'short_answer'
          ? userAns.trim().toLowerCase() === eq.question.correct_answer.trim().toLowerCase()
          : userAns === eq.question.correct_answer
        if (isCorrect) {
          correct++
          earnedPoints += points
        }
        await submitAnswer(attemptId, eq.question_id, userAns, isCorrect, isCorrect ? points : 0)
      }
      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
      await completeAttempt(attemptId, score, totalPoints)
      log('exam_submitted', { score, correct, total: questions.length })
      queryClient.invalidateQueries({ queryKey: ['my-exam-attempts', user?.id] })
      navigate(`/results/${attemptId}`, { replace: true })
    } catch (e: any) {
      setError(e.message)
      setSubmitting(false)
    }
  }, [attemptId, questions, answers, submitting, navigate, log, queryClient, user?.id])

  const handleTimeUp = useCallback(() => {
    if (!submitting) handleSubmit()
  }, [submitting, handleSubmit])

  const handleSubmitClick = () => {
    if (!questions) return
    const unanswered = questions.filter(q => !(q.question_id in answers)).length
    if (unanswered > 0) {
      setShowConfirm(true)
    } else {
      handleSubmit()
    }
  }

  if (exam && gate === 'no_attempts') {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <p className="text-lg font-bold text-text">No attempts left</p>
        <p className="mt-2 text-text-muted">Your best score: {getBestScore(pastAttempts)}%</p>
        <button onClick={() => navigate('/exams')} className="mt-4 rounded-lg bg-brand px-6 py-2 text-white">Back to Exams</button>
      </div>
    )
  }
  if (exam && gate === 'cooldown') {
    const ms = cooldownRemainingMs(exam, pastAttempts)
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <p className="text-lg font-bold text-text">Too soon to retake</p>
        <p className="mt-2 text-text-muted">Next attempt available in about {Math.ceil(ms / 3.6e6)} hours.</p>
        <button onClick={() => navigate('/exams')} className="mt-4 rounded-lg bg-brand px-6 py-2 text-white">Back to Exams</button>
      </div>
    )
  }

  if (isLoading) {
    return <p className="mt-16 text-center text-text-muted">Loading exam...</p>
  }

  if (error) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <p className="text-lg text-danger">{error}</p>
        <button onClick={() => navigate('/exams')} className="mt-4 rounded-lg bg-brand px-6 py-2 text-white">Back to Exams</button>
      </div>
    )
  }

  if (!exam || !questions || questions.length === 0) {
    return (
      <div className="mt-16 text-center">
        <p className="text-text-muted">Exam not found or has no questions.</p>
        <button onClick={() => navigate('/exams')} className="mt-4 rounded-lg bg-brand px-6 py-2 text-white">Back to Exams</button>
      </div>
    )
  }

  return (
    <AntiCheatGuard
      examId={id!}
      maxWarnings={3}
      durationMinutes={exam.time_limit_minutes}
      onTimeUp={handleTimeUp}
      onDisqualified={handleTimeUp}
      onViolation={(type) => log('violation', { type })}
    >
      <div className="mx-auto max-w-3xl">
        <Watermark label={`${user?.user_metadata?.full_name ?? user?.email ?? 'Student'}${user?.user_metadata?.grade ? ` — Grade ${user.user_metadata.grade}` : ''}`} />
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm text-text-muted">
            {answered}/{total} answered
          </span>
          <div className="mx-4 h-2 flex-1 rounded-full bg-surface-light">
            <div
              className="h-2 rounded-full bg-brand transition-all"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={answered === 0 || saving || !attemptId}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleSubmitClick}
            disabled={submitting || !attemptId}
            className="rounded-lg bg-accent-green px-4 py-2 text-sm font-semibold text-white hover:bg-accent-green/80 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : !attemptId ? 'Loading...' : 'Submit'}
          </button>
        </div>

        {current && (
          <QuestionView
            question={current.question}
            index={currentIndex}
            total={total}
            selected={answers[current.question_id]}
            onAnswer={(a) => handleAnswer(current.question_id, a)}
            onNext={() => setCurrentIndex(i => Math.min(i + 1, total - 1))}
            onPrev={() => setCurrentIndex(i => Math.max(i - 1, 0))}
          />
        )}

        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-2xl">
              <h2 className="mb-4 text-2xl font-black text-text">Submit Exam?</h2>
              <p className="mb-2 text-text-muted">
                You have {questions.filter(q => !(q.question_id in answers)).length} unanswered question(s).
                Unanswered questions will be marked as incorrect.
              </p>
              <p className="mb-6 text-sm text-text-muted">Are you sure you want to submit?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-lg border border-border px-5 py-3 text-text-muted hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowConfirm(false); handleSubmit() }}
                  className="flex-1 rounded-lg bg-danger px-5 py-3 font-bold text-white hover:bg-danger/80"
                >
                  Submit Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AntiCheatGuard>
  )
}

function QuestionView({
  question, index, total, selected, onAnswer, onNext, onPrev,
}: {
  question: Question; index: number; total: number; selected?: string
  onAnswer: (answer: string) => void; onNext: () => void; onPrev: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-semibold text-brand">Q{index + 1} / {total}</span>
        <DifficultyBadge level={question.difficulty} />
      </div>

      {question.image_url && (
        <div className="mb-6 flex justify-center">
          <img src={question.image_url} alt="Diagram" className="max-h-64 rounded-lg" />
        </div>
      )}

      <div className="mb-8 text-lg font-medium leading-relaxed text-text">
        <LatexRenderer content={question.question_text} />
      </div>

      <div className="space-y-3">
        {question.type === 'multiple_choice' && question.options.map((opt, i) => {
          const val = String(i)
          return (
            <button key={i} onClick={() => onAnswer(val)}
              className={`w-full rounded-lg border px-5 py-3 text-left transition ${
                selected === val ? 'border-brand bg-brand/10 text-text' : 'border-border text-text-muted hover:border-brand/50 hover:text-text'
              }`}
            >
              <span className="mr-3 font-mono text-sm text-text-muted">{String.fromCharCode(65 + i)}.</span>
              <LatexRenderer content={opt} />
            </button>
          )
        })}

        {question.type === 'true_false' && ['True', 'False'].map(opt => (
          <button key={opt} onClick={() => onAnswer(opt.toLowerCase())}
            className={`w-full rounded-lg border px-5 py-3 text-left transition ${
              selected === opt.toLowerCase() ? 'border-brand bg-brand/10 text-text' : 'border-border text-text-muted hover:border-brand/50 hover:text-text'
            }`}
          >
            {opt}
          </button>
        ))}

        {question.type === 'short_answer' && (
          <input type="text" value={selected ?? ''} onChange={e => onAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="w-full rounded-lg border border-border bg-white px-5 py-3 text-ink outline-none focus:border-brand"
          />
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onPrev} disabled={index === 0}
          className="rounded-lg border border-border px-5 py-2 text-sm text-text-muted hover:text-text disabled:opacity-30"
        >← Previous</button>
        <button onClick={onNext} disabled={index === total - 1}
          className="rounded-lg border border-border px-5 py-2 text-sm text-text-muted hover:text-text disabled:opacity-30"
        >Next →</button>
      </div>
    </div>
  )
}
