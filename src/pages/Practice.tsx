import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchExamQuestions } from '../lib/exams'
import { startPractice, upsertAnswer, finishPractice } from '../lib/practice'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useActivityLogger } from '../hooks/useActivityLogger'
import { seededShuffle, shuffleMultipleChoice } from '../lib/shuffle'
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
  const [completed, setCompleted] = useState(false)
  const attemptRef = useRef<ExamAttempt | null>(null)
  const [saving, setSaving] = useState(false)
  const correctCountRef = useRef(0)

  type ExamWithQuestions = Exam & { questions: (ExamQuestion & { question: Question })[] }

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
      const mapped = shuffled.map(eq => {
        if (eq.question.type === 'multiple_choice' && eq.question.options.length > 0) {
          const { options, correctAnswer } = shuffleMultipleChoice(
            eq.question.options, eq.question.correct_answer, seed + eq.question.id
          )
          return { ...eq, question: { ...eq.question, options, correct_answer: correctAnswer } }
        }
        return eq
      })
      return { ...(examResult.data as Exam), questions: mapped }
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (id && user) {
      startPractice(id, user.id).then(attempt => {
        attemptRef.current = attempt
        log('practice_started', { exam_id: id })
      }).catch(() => {})
    }
  }, [id, user])

  if (!user) return null
  if (!exam || !exam.questions || exam.questions.length === 0) return <p className="text-text-muted">Loading...</p>

  const eqs = exam.questions
  const current = eqs[currentIndex]
  if (!current) return <p className="text-text-muted">Loading question...</p>

  const handleSubmit = async () => {
    if (!selectedAnswer || !attemptRef.current) return
    setSaving(true)
    const ans = selectedAnswer ?? ''
    const correct = current.question.type === 'short_answer'
      ? ans.trim().toLowerCase() === current.question.correct_answer.trim().toLowerCase()
      : ans === current.question.correct_answer
    try {
      await upsertAnswer(attemptRef.current.id, current.question.id, ans, correct, correct ? 1 : 0)
      if (correct) correctCountRef.current++
      setSubmitted(true)
      log('practice_answered', { question_id: current.question.id, correct, answer_given: selectedAnswer })
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
        const total = eqs.length
        const correctCount = correctCountRef.current
        await finishPractice(attemptRef.current.id, correctCount, total)
        log('exam_submitted', { total, correct: correctCount, attempt_id: attemptRef.current.id })
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
        {current.question.image_url && (
          <div className="mb-4 flex justify-center">
            <img src={current.question.image_url} alt="Diagram" className="max-h-48 rounded-lg" />
          </div>
        )}
        <p className="mb-6 text-lg font-medium text-text"><LatexRenderer content={current.question.question_text} /></p>

        {current.question.type === 'multiple_choice' && current.question.options.map((opt, i) => (
          <button key={i} onClick={() => !submitted && setSelectedAnswer(String(i))}
            className={`mb-2 block w-full rounded-lg border p-4 text-left transition ${
              submitted
                ? String(i) === current.question.correct_answer ? 'border-accent-green bg-accent-green/5'
                  : selectedAnswer === String(i) ? 'border-danger bg-danger/5' : 'border-border'
                : selectedAnswer === String(i) ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50'
            }`}
          >
            <LatexRenderer content={opt} />
          </button>
        ))}

        {current.question.type === 'true_false' && ['true', 'false'].map(opt => (
          <button key={opt} onClick={() => !submitted && setSelectedAnswer(opt)}
            className={`mb-2 block w-full rounded-lg border p-4 text-left transition ${
              submitted
                ? opt === current.question.correct_answer ? 'border-accent-green bg-accent-green/5'
                  : selectedAnswer === opt ? 'border-danger bg-danger/5' : 'border-border'
                : selectedAnswer === opt ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50'
            }`}
          >
            {opt === 'true' ? 'True' : 'False'}
          </button>
        ))}

        {current.question.type === 'short_answer' && (
          <input value={selectedAnswer ?? ''} onChange={e => !submitted && setSelectedAnswer(e.target.value)}
            placeholder="Type your answer..." className="w-full rounded-lg border border-border bg-white px-4 py-3 text-ink"
            disabled={submitted}
          />
        )}
      </div>

      {submitted && (
        <div className={`mb-6 rounded-xl border p-4 ${
          selectedAnswer !== null && (
            current.question.type === 'short_answer'
              ? selectedAnswer.trim().toLowerCase() === current.question.correct_answer.trim().toLowerCase()
              : selectedAnswer === current.question.correct_answer
          ) ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'
        }`}>
          <p className={`font-bold ${
            selectedAnswer !== null && (
              current.question.type === 'short_answer'
                ? selectedAnswer.trim().toLowerCase() === current.question.correct_answer.trim().toLowerCase()
                : selectedAnswer === current.question.correct_answer
            ) ? 'text-accent-green' : 'text-danger'
          }`}>
            {selectedAnswer !== null && (
              current.question.type === 'short_answer'
                ? selectedAnswer.trim().toLowerCase() === current.question.correct_answer.trim().toLowerCase()
                : selectedAnswer === current.question.correct_answer
            ) ? 'Correct!' : 'Wrong'}
          </p>
          {selectedAnswer !== null && !(
            current.question.type === 'short_answer'
              ? selectedAnswer.trim().toLowerCase() === current.question.correct_answer.trim().toLowerCase()
              : selectedAnswer === current.question.correct_answer
          ) && <p className="text-sm text-accent-green mt-1">Correct answer: {current.question.correct_answer}</p>}
          <p className="mt-1 text-sm text-text-muted"><LatexRenderer content={current.question.explanation} /></p>
        </div>
      )}

      <div className="flex justify-between">
        {submitted
          ? <button onClick={handleNext} className="rounded-lg bg-brand px-6 py-2 font-semibold text-white">
              {currentIndex < eqs.length - 1 ? 'Next Question →' : 'See Results'}
            </button>
          : <button onClick={handleSubmit} disabled={!selectedAnswer || saving}
              className="rounded-lg bg-brand px-6 py-2 font-semibold text-white disabled:opacity-50">
              {saving ? 'Saving...' : 'Submit Answer'}
            </button>
        }
      </div>
    </div>
  )
}
