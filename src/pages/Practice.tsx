import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchExamQuestions } from '../lib/exams'
import { startPractice, upsertAnswer, finishPractice } from '../lib/practice'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useActivityLogger } from '../hooks/useActivityLogger'
import { seededShuffle, shuffleMultipleChoice } from '../lib/shuffle'
import { applyTemplate } from '../lib/params'
import LatexRenderer from '../components/LatexRenderer'
import type { Exam, ExamQuestion, Question, ExamAttempt } from '../types'

export default function Practice() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
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
    if (!user) { navigate('/login'); return }
    if (id && user && !startedRef.current) {
      startedRef.current = true
      startPractice(id, user.id).then(attempt => {
        attemptRef.current = attempt
        log('practice_started', { exam_id: id })
      }).catch(e => {
        console.error('Failed to start practice', e)
        setInitError('Failed to start practice session. Please try again.')
      })
    }
  }, [id, user])

  if (!user) return null
  if (!exam || !exam.questions || exam.questions.length === 0) return <p className="text-text-muted">Loading...</p>

  if (initError) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-danger bg-danger/5 p-8 text-center">
        <p className="text-lg font-bold text-danger">Could not start practice session</p>
        <p className="mt-2 text-text-muted">{initError}</p>
        <button onClick={() => navigate('/exams')} className="mt-4 rounded-lg bg-brand px-6 py-2 font-semibold text-white">Back to Exams</button>
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
    if (!selectedAnswer || !attemptRef.current) return
    setSaving(true)
    const ans = selectedAnswer ?? ''
    const correct = activeQuestion.type === 'short_answer'
      ? ans.trim().toLowerCase() === activeQuestion.correct_answer.trim().toLowerCase()
      : ans === activeQuestion.correct_answer
    try {
      // First submission per question is scored; template retries are practice-only
      if (!scoredQuestionsRef.current.has(activeQuestion.id)) {
        scoredQuestionsRef.current.add(activeQuestion.id)
        await upsertAnswer(attemptRef.current.id, activeQuestion.id, ans, correct, correct ? 1 : 0)
        if (correct) correctCountRef.current++
      }
      setSubmitted(true)
      log('practice_answered', { question_id: activeQuestion.id, correct, answer_given: selectedAnswer })
    } catch (e) {
      console.error('Failed to save answer', e)
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
      if (attemptRef.current) {
        const total = eqs.reduce((sum, eq) => sum + (eq.points ?? 1), 0)
        const correctCount = correctCountRef.current
        const percentage = Math.round((correctCount / eqs.length) * 100)
        try {
          await finishPractice(attemptRef.current.id, percentage, total)
          log('practice_submitted', { total, correct: correctCount, attempt_id: attemptRef.current.id })
        } catch (e) {
          console.error('Failed to finish practice', e)
        }
      }
      navigate(`/results/${attemptRef.current!.id}`)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text">{exam.title}</h1>
        <span className="text-sm text-text-muted">Question {currentIndex + 1} of {eqs.length}</span>
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
          <input value={selectedAnswer ?? ''} onChange={e => !submitted && setSelectedAnswer(e.target.value)}
            placeholder="Type your answer..." className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-ink"
            disabled={submitted}
          />
        )}
      </div>

      {submitted && (
        <div className={`mb-6 rounded-xl border p-4 ${
          selectedAnswer !== null && (
            activeQuestion.type === 'short_answer'
              ? selectedAnswer.trim().toLowerCase() === activeQuestion.correct_answer.trim().toLowerCase()
              : selectedAnswer === activeQuestion.correct_answer
          ) ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'
        }`}>
          <p className={`font-bold ${
            selectedAnswer !== null && (
              activeQuestion.type === 'short_answer'
                ? selectedAnswer.trim().toLowerCase() === activeQuestion.correct_answer.trim().toLowerCase()
                : selectedAnswer === activeQuestion.correct_answer
            ) ? 'text-accent-green' : 'text-danger'
          }`}>
            {selectedAnswer !== null && (
              activeQuestion.type === 'short_answer'
                ? selectedAnswer.trim().toLowerCase() === activeQuestion.correct_answer.trim().toLowerCase()
                : selectedAnswer === activeQuestion.correct_answer
            ) ? 'Correct!' : 'Wrong'}
          </p>
          {selectedAnswer !== null && !(
            activeQuestion.type === 'short_answer'
              ? selectedAnswer.trim().toLowerCase() === activeQuestion.correct_answer.trim().toLowerCase()
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
