import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchExamQuestions } from '../lib/exams'
import { startPractice, upsertAnswer, finishPractice } from '../lib/practice'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useActivityLogger } from '../hooks/useActivityLogger'
import { seededShuffle, shuffleMultipleChoice } from '../lib/shuffle'
import { applyTemplate } from '../lib/params'
import LatexRenderer from '../components/LatexRenderer'
import Scratchpad from '../components/Scratchpad'
import CartesianGrapherModal from '../components/CartesianGrapherModal'
import MathInput from '../components/MathInput'
import { isMathAnswerEqual } from '../lib/mathNormalize'
import type { Exam, ExamQuestion, Question, ExamAttempt } from '../types'

export default function Practice() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { log } = useActivityLogger(id)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const attemptRef = useRef<ExamAttempt | null>(null)
  const [saving, setSaving] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const correctCountRef = useRef(0)
  const startedRef = useRef(false)
  const [questionOverrides, setQuestionOverrides] = useState<Record<string, Question>>({})
  const retryCountsRef = useRef<Record<string, number>>({})
  const scoredQuestionsRef = useRef<Set<string>>(new Set())

  type ExamWithQuestions = Exam & {
    questions: (ExamQuestion & { question: Question })[]
    bases: Record<string, Question>
  }

  const { data: exam } = useQuery<ExamWithQuestions>({
    queryKey: ['practice', id],
    queryFn: async () => {
      const [examResult, rawQuestions] = await Promise.all([
        supabase.from('exams').select('*').eq('id', id!).single(),
        fetchExamQuestions(id!),
      ])
      if (examResult.error) throw examResult.error
      const seed = id || 'practice_default'
      const shuffled = examResult.data.shuffle_questions
        ? seededShuffle(rawQuestions, seed + '_questions')
        : [...rawQuestions]
      const bases: Record<string, Question> = {}
      for (const eq of shuffled) bases[eq.question.id] = eq.question
      const mapped = shuffled.map(eq => {
        // Resolve param templates first so substituted values feed option shuffling
        const templated = applyTemplate(
          eq.question as unknown as { question_text: string; options: string[]; correct_answer: string; type: string },
          `${seed}::${eq.question.id}`,
        ) as Partial<Question>
        const question: Question = { ...eq.question, ...templated }
        if (question.type === 'multiple_choice' && question.options.length > 0) {
          const { options, correctAnswer } = shuffleMultipleChoice(
            question.options, question.correct_answer, seed + question.id
          )
          return { ...eq, question: { ...question, options, correct_answer: correctAnswer } }
        }
        return { ...eq, question }
      })
      return { ...(examResult.data as Exam), questions: mapped, bases }
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (authLoading) return
    if (id && !startedRef.current) {
      startedRef.current = true
      const uid = user?.id || 'guest_user'
      startPractice(id, uid)
        .then((attempt) => {
          attemptRef.current = attempt
          log('practice_started', { exam_id: id })
        })
        .catch((e) => {
          console.warn('Backend startPractice failed, falling back to local practice session:', e)
          if (!id) {
            setInitError('Practice sheet not found.')
            return
          }
          // Robust session fallback: student can practice without being kicked out!
          attemptRef.current = {
            id: `local_att_${Date.now()}`,
            exam_id: id,
            user_id: uid,
            started_at: new Date().toISOString(),
            total_points: 0,
            status: 'in_progress',
          }
        })
    }
  }, [id, user, authLoading, log])

  if (authLoading) {
    return (
      <div className="mx-auto max-w-xl p-12 text-center">
        <p className="text-text-muted">Loading practice session...</p>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-danger/30 bg-danger/5 p-8 text-center space-y-3">
        <p className="text-lg font-bold text-danger">Could not start practice session</p>
        <p className="text-sm text-text-muted">{initError}</p>
        <Link
          to="/sheets"
          className="inline-block rounded-xl bg-brand px-6 py-2.5 font-bold text-white hover:bg-brand-light transition"
        >
          Back to Sheets
        </Link>
      </div>
    )
  }

  if (!exam || !exam.questions || exam.questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-8 text-center space-y-4">
        <div className="text-4xl">📄</div>
        <h2 className="text-xl font-bold text-ink">{exam?.title || 'Practice Sheet'}</h2>
        <p className="text-sm text-text-muted">
          No questions have been attached to this sheet yet, or the sheet is being prepared.
        </p>
        <Link
          to="/sheets"
          className="inline-block rounded-xl bg-brand px-6 py-2.5 font-bold text-white hover:bg-brand-light transition"
        >
          Back to Sheets
        </Link>
      </div>
    )
  }

  const eqs = exam.questions
  const current = eqs[currentIndex]
  if (!current) return <p className="text-text-muted">Loading question...</p>

  const activeQuestion = questionOverrides[current.question.id] ?? current.question

  const isRetryable = !!activeQuestion.params && Object.keys(activeQuestion.params).length > 0

  const handleRetry = () => {
    const qid = current.question.id
    const base = exam.bases[qid] ?? current.question
    const n = (retryCountsRef.current[qid] ?? 0) + 1
    retryCountsRef.current[qid] = n
    const fresh = applyTemplate(
      base as unknown as { question_text: string; options: string[]; correct_answer: string; type: string },
      `${id ?? 'practice_default'}::${qid}::r${n}`,
    ) as Partial<Question>
    setQuestionOverrides(prev => ({ ...prev, [qid]: { ...current.question, ...fresh } }))
    setSelectedAnswer(null)
    setSubmitted(false)
  }

  const handleSubmit = async () => {
    if (!selectedAnswer) return
    setSaving(true)
    const ans = selectedAnswer ?? ''
    const correct = activeQuestion.type === 'short_answer'
      ? isMathAnswerEqual(ans, activeQuestion.correct_answer)
      : ans === activeQuestion.correct_answer

    const attId = attemptRef.current?.id || `local_att_${Date.now()}`
    try {
      if (!scoredQuestionsRef.current.has(activeQuestion.id)) {
        scoredQuestionsRef.current.add(activeQuestion.id)
        if (!attId.startsWith('local_')) {
          await upsertAnswer(attId, activeQuestion.id, ans, correct, correct ? 1 : 0)
        }
        if (correct) correctCountRef.current++
      }
      setSubmitted(true)
      log('practice_answered', { question_id: activeQuestion.id, correct, answer_given: selectedAnswer })
    } catch (e) {
      console.warn('Answer saved locally:', e)
      setSubmitted(true)
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    if (currentIndex < eqs.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setSubmitted(false)
    } else {
      const attId = attemptRef.current?.id || `local_att_${Date.now()}`
      const total = eqs.reduce((sum, eq) => sum + (eq.points ?? 1), 0)
      const correctCount = correctCountRef.current
      const percentage = Math.round((correctCount / eqs.length) * 100)

      if (!attId.startsWith('local_')) {
        try {
          await finishPractice(attId, percentage, total)
          log('practice_submitted', { total, correct: correctCount, attempt_id: attId })
        } catch (e) {
          console.warn('Failed to finish practice on backend:', e)
        }
      }
      navigate(`/results/${attId}`)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">{exam.title}</h1>
        <div className="flex items-center gap-3">
          <Scratchpad />
          <CartesianGrapherModal
            onInsertAnswer={(summary) => {
              if (activeQuestion.type === 'short_answer' && !submitted) {
                setSelectedAnswer(summary)
              }
            }}
          />
          <span className="text-sm text-text-muted">Question {currentIndex + 1} of {eqs.length}</span>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-surface p-6">
        {activeQuestion.image_url && (
          <div className="mb-4 flex justify-center">
            <img src={activeQuestion.image_url} alt="Diagram" className="max-h-48 rounded-lg" />
          </div>
        )}
        <p className="mb-6 text-lg font-medium text-text"><LatexRenderer content={activeQuestion.question_text} /></p>

        {activeQuestion.type === 'multiple_choice' && activeQuestion.options.map((opt, i) => (
          <button key={i} onClick={() => !submitted && setSelectedAnswer(String(i))}
            className={`mb-2 block w-full rounded-lg border p-4 text-left transition ${
              submitted
                ? String(i) === activeQuestion.correct_answer ? 'border-accent-green bg-accent-green/5'
                  : selectedAnswer === String(i) ? 'border-danger bg-danger/5' : 'border-border'
                : selectedAnswer === String(i) ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50'
            }`}
          >
            <LatexRenderer content={opt} />
          </button>
        ))}

        {activeQuestion.type === 'true_false' && ['true', 'false'].map(opt => (
          <button key={opt} onClick={() => !submitted && setSelectedAnswer(opt)}
            className={`mb-2 block w-full rounded-lg border p-4 text-left transition ${
              submitted
                ? opt === activeQuestion.correct_answer ? 'border-accent-green bg-accent-green/5'
                  : selectedAnswer === opt ? 'border-danger bg-danger/5' : 'border-border'
                : selectedAnswer === opt ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50'
            }`}
          >
            {opt === 'true' ? 'True' : 'False'}
          </button>
        ))}

        {activeQuestion.type === 'short_answer' && (
          <MathInput
            value={selectedAnswer ?? ''}
            onChange={val => !submitted && setSelectedAnswer(val)}
            placeholder="Type your answer..."
            disabled={submitted}
          />
        )}
      </div>

      {submitted && (
        <div className={`mb-6 rounded-xl border p-4 ${
          selectedAnswer !== null && (
            activeQuestion.type === 'short_answer'
              ? isMathAnswerEqual(selectedAnswer, activeQuestion.correct_answer)
              : selectedAnswer === activeQuestion.correct_answer
          ) ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'
        }`}>
          <p className={`font-bold ${
            selectedAnswer !== null && (
              activeQuestion.type === 'short_answer'
                ? isMathAnswerEqual(selectedAnswer, activeQuestion.correct_answer)
                : selectedAnswer === activeQuestion.correct_answer
            ) ? 'text-accent-green' : 'text-danger'
          }`}>
            {selectedAnswer !== null && (
              activeQuestion.type === 'short_answer'
                ? isMathAnswerEqual(selectedAnswer, activeQuestion.correct_answer)
                : selectedAnswer === activeQuestion.correct_answer
            ) ? 'Correct!' : 'Wrong'}
          </p>
          {selectedAnswer !== null && !(
            activeQuestion.type === 'short_answer'
              ? isMathAnswerEqual(selectedAnswer, activeQuestion.correct_answer)
              : selectedAnswer === activeQuestion.correct_answer
          ) && <p className="text-sm text-accent-green mt-1">Correct answer: {activeQuestion.type === 'multiple_choice' ? activeQuestion.options[parseInt(activeQuestion.correct_answer)] || activeQuestion.correct_answer : activeQuestion.correct_answer}</p>}
          <div className="mt-3 space-y-2 leading-relaxed border-t border-border/60 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">How to solve</p>
            <LatexRenderer content={activeQuestion.explanation} />
          </div>
        </div>
      )}

      <div className="flex justify-between gap-2">
        {submitted ? (
          <>
            {isRetryable && (
              <button
                onClick={handleRetry}
                className="rounded-lg border border-brand bg-brand/5 px-4 py-2 font-medium text-ink hover:bg-brand/10"
              >
                ↻ Try new numbers (not scored)
              </button>
            )}
            <button onClick={handleNext} className="ml-auto rounded-lg bg-brand px-6 py-2 font-semibold text-white">
              {currentIndex < eqs.length - 1 ? 'Next Question →' : 'See Results'}
            </button>
          </>
        ) : (
          <button onClick={handleSubmit} disabled={!selectedAnswer || saving}
              className="ml-auto rounded-lg bg-brand px-6 py-2 font-semibold text-white disabled:opacity-50">
              {saving ? 'Saving...' : 'Submit Answer'}
            </button>
        )}
      </div>
    </div>
  )
}
