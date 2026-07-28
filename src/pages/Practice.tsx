import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchExamQuestions } from '../lib/exams'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useActivityLogger } from '../hooks/useActivityLogger'
import { seededShuffle, shuffleMultipleChoice } from '../lib/shuffle'
import LatexRenderer from '../components/LatexRenderer'
import type { Exam, ExamQuestion, Question } from '../types'

export default function Practice() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { log } = useActivityLogger(id)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<{ questionId: string; given: string; correct: boolean }[]>([])
  const [completed, setCompleted] = useState(false)

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

  if (!user) { navigate('/login'); return null }
  if (!exam || !exam.questions || exam.questions.length === 0) return <p className="text-text-muted">Loading...</p>

  const eqs = exam.questions
  const current = eqs[currentIndex]
  if (!current) return <p className="text-text-muted">Loading question...</p>

  const handleSubmit = () => {
    if (!selectedAnswer) return
    const correct = selectedAnswer === current.question.correct_answer
    setAnswers([...answers, { questionId: current.question.id, given: selectedAnswer, correct }])
    setSubmitted(true)
    log('practice_answered', { question_id: current.question.id, correct, answer_given: selectedAnswer })
  }

  const handleNext = () => {
    if (currentIndex < eqs.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setSubmitted(false)
    } else {
      setCompleted(true)
      log('exam_submitted', { total: eqs.length, correct: answers.filter(a => a.correct).length })
    }
  }

  if (completed) {
    const correctCount = answers.filter(a => a.correct).length
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-black text-text">Practice Complete!</h1>
        <div className="mb-6 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-5xl font-black text-text">{correctCount}/{eqs.length}</p>
          <p className="mt-2 text-text-muted">{(correctCount / eqs.length * 100).toFixed(0)}% correct</p>
        </div>
        {eqs.map((eq, i) => {
          const ans = answers[i]
          return (
            <div key={eq.id} className={`mb-3 rounded-xl border p-4 ${ans?.correct ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'}`}>
              <p className="font-medium text-text"><LatexRenderer content={eq.question.question_text} /></p>
              {eq.question.image_url && <img src={eq.question.image_url} alt="Diagram" className="mt-2 max-h-32 rounded" />}
              <p className="mt-1 text-sm">Your answer: <span className={ans?.correct ? 'text-accent-green' : 'text-danger'}>{ans?.given}</span></p>
              {!ans?.correct && <p className="text-sm text-accent-green">Correct: {eq.question.correct_answer}</p>}
              <p className="mt-1 text-xs text-text-muted"><LatexRenderer content={eq.question.explanation} /></p>
            </div>
          )
        })}
        <button onClick={() => navigate('/exams')} className="mt-4 rounded-lg bg-brand px-6 py-2 font-semibold text-white">Back to Exams</button>
      </div>
    )
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
        <div className={`mb-6 rounded-xl border p-4 ${answers[answers.length - 1]?.correct ? 'border-accent-green bg-accent-green/5' : 'border-danger bg-danger/5'}`}>
          <p className={`font-bold ${answers[answers.length - 1]?.correct ? 'text-accent-green' : 'text-danger'}`}>
            {answers[answers.length - 1]?.correct ? 'Correct!' : 'Wrong'}
          </p>
          {!answers[answers.length - 1]?.correct && <p className="text-sm text-accent-green mt-1">Correct answer: {current.question.correct_answer}</p>}
          <p className="mt-1 text-sm text-text-muted"><LatexRenderer content={current.question.explanation} /></p>
        </div>
      )}

      <div className="flex justify-between">
        {submitted
          ? <button onClick={handleNext} className="rounded-lg bg-brand px-6 py-2 font-semibold text-white">
              {currentIndex < eqs.length - 1 ? 'Next Question →' : 'See Results'}
            </button>
          : <button onClick={handleSubmit} disabled={!selectedAnswer} className="rounded-lg bg-brand px-6 py-2 font-semibold text-white disabled:opacity-50">Submit Answer</button>
        }
      </div>
    </div>
  )
}
