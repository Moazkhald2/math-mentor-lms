import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  fetchPracticeQuestionsSafe,
  resumeOrStartPractice,
  upsertAnswer,
  finishPractice,
  savePracticeCheckpoint,
  loadPracticeCheckpoint,
  clearPracticeCheckpoint,
  type SavedPracticeAnswer,
} from '../lib/practice'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useActivityLogger } from '../hooks/useActivityLogger'
import { seededShuffle, shuffleMultipleChoice } from '../lib/shuffle'
import { applyTemplate } from '../lib/params'
import LatexRenderer from '../components/LatexRenderer'
import Scratchpad from '../components/Scratchpad'
import CartesianGrapherModal from '../components/CartesianGrapherModal'
import MathInput from '../components/MathInput'
import Watermark from '../components/Watermark'
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
  const [exiting, setExiting] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const correctCountRef = useRef(0)
  const startedRef = useRef(false)
  const appliedResumeIndexRef = useRef(false)
  const [questionOverrides, setQuestionOverrides] = useState<Record<string, Question>>({})
  const retryCountsRef = useRef<Record<string, number>>({})
  const scoredQuestionsRef = useRef<Set<string>>(new Set())
  const [answeredMap, setAnsweredMap] = useState<Record<string, SavedPracticeAnswer>>({})
  const [resumedInfo, setResumedInfo] = useState<{ answeredCount: number } | null>(null)
  const [sessionInitialized, setSessionInitialized] = useState(false)
  const savedCheckpointIndexRef = useRef<number | null>(null)

  type ExamWithQuestions = Exam & {
    questions: (ExamQuestion & { question: Question })[]
    bases: Record<string, Question>
  }

  const { data: exam } = useQuery<ExamWithQuestions>({
    queryKey: ['practice', id],
    queryFn: async () => {
      const [examResult, rawQuestions] = await Promise.all([
        supabase.from('exams').select('*').eq('id', id!).single(),
        fetchPracticeQuestionsSafe(id!),
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
    enabled: !!id && !!user,
  })

  const persistCheckpoint = useCallback(
    (nextIndex: number, nextAnsweredMap: Record<string, SavedPracticeAnswer>, totalQuestions: number) => {
      if (!user || !id || totalQuestions <= 0) return
      const attId = attemptRef.current?.id || `local_att_${id}`
      savePracticeCheckpoint({
        attemptId: attId,
        examId: id,
        userId: user.id,
        currentIndex: nextIndex,
        totalQuestions,
        answeredMap: nextAnsweredMap,
        updatedAt: new Date().toISOString(),
      })
    },
    [user, id]
  )

  useEffect(() => {
    if (authLoading || !user) return
    if (id && !startedRef.current) {
      startedRef.current = true
      const uid = user.id
      const localCp = loadPracticeCheckpoint(uid, id)
      if (localCp && typeof localCp.currentIndex === 'number') {
        savedCheckpointIndexRef.current = localCp.currentIndex
      }

      resumeOrStartPractice(id, uid)
        .then(({ attempt, answers, resumed }) => {
          attemptRef.current = attempt

          const merged: Record<string, SavedPracticeAnswer> = {
            ...(localCp?.answeredMap ?? {}),
          }
          const serverQids = new Set<string>()
          for (const row of answers) {
            serverQids.add(row.question_id)
            merged[row.question_id] = {
              answer: row.answer,
              isCorrect: !!row.is_correct,
            }
          }

          // Rehydrate refs from merged answers
          scoredQuestionsRef.current = new Set(Object.keys(merged))
          correctCountRef.current = Object.values(merged).filter((a) => a.isCorrect).length
          setAnsweredMap(merged)

          const mergedCount = Object.keys(merged).length
          if (resumed || mergedCount > 0 || (localCp && localCp.currentIndex > 0)) {
            setResumedInfo({ answeredCount: mergedCount })
            log('practice_resumed', { exam_id: id, attempt_id: attempt.id, answered: mergedCount })
          } else {
            log('practice_started', { exam_id: id })
          }

          // Flush any offline-only local answers to the active server attempt
          if (!attempt.id.startsWith('local_') && localCp?.answeredMap) {
            for (const [qid, entry] of Object.entries(localCp.answeredMap)) {
              if (!serverQids.has(qid)) {
                upsertAnswer(attempt.id, qid, entry.answer, entry.isCorrect, entry.isCorrect ? 1 : 0).catch(() => {})
              }
            }
          }

          setSessionInitialized(true)
        })
        .catch((e) => {
          console.warn('Backend resumeOrStartPractice failed, falling back to local practice session:', e)
          if (!id) {
            setInitError('Practice sheet not found.')
            return
          }
          // Robust session fallback: restore local checkpoint if present
          attemptRef.current = {
            id: localCp?.attemptId || `local_att_${Date.now()}`,
            exam_id: id,
            user_id: uid,
            started_at: new Date().toISOString(),
            total_points: 0,
            status: 'in_progress',
          }
          const localAnswers = localCp?.answeredMap ?? {}
          scoredQuestionsRef.current = new Set(Object.keys(localAnswers))
          correctCountRef.current = Object.values(localAnswers).filter((a) => a.isCorrect).length
          setAnsweredMap(localAnswers)
          if (Object.keys(localAnswers).length > 0 || (localCp && localCp.currentIndex > 0)) {
            setResumedInfo({ answeredCount: Object.keys(localAnswers).length })
          }
          setSessionInitialized(true)
        })
    }
  }, [id, user, authLoading, log])

  // Once both exam questions and session hydration are ready, jump to the right resume index
  useEffect(() => {
    if (!sessionInitialized || !exam || exam.questions.length === 0 || appliedResumeIndexRef.current) return
    appliedResumeIndexRef.current = true

    const eqs = exam.questions
    let targetIndex = 0
    if (savedCheckpointIndexRef.current !== null) {
      targetIndex = Math.max(0, Math.min(savedCheckpointIndexRef.current, eqs.length - 1))
    } else if (Object.keys(answeredMap).length > 0) {
      const firstUnanswered = eqs.findIndex((eq) => !answeredMap[eq.question.id])
      targetIndex = firstUnanswered === -1 ? eqs.length - 1 : firstUnanswered
    }

    setCurrentIndex(targetIndex)
    const targetQid = eqs[targetIndex]?.question.id
    if (targetQid && answeredMap[targetQid]) {
      setSelectedAnswer(answeredMap[targetQid].answer)
      setSubmitted(true)
    }

    persistCheckpoint(targetIndex, answeredMap, eqs.length)
  }, [sessionInitialized, exam, answeredMap, persistCheckpoint])

  if (authLoading) {
    return (
      <div className="mx-auto max-w-xl p-12 text-center">
        <p className="text-text-muted">Loading practice session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(`/practice/${id ?? ''}`)}`} replace />
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
  const answeredCount = Object.keys(answeredMap).length
  const progressPercent = eqs.length > 0 ? Math.min(100, Math.round((answeredCount / eqs.length) * 100)) : 0

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
    let nextAnsweredMap = answeredMap
    try {
      if (!scoredQuestionsRef.current.has(activeQuestion.id)) {
        scoredQuestionsRef.current.add(activeQuestion.id)
        nextAnsweredMap = {
          ...answeredMap,
          [activeQuestion.id]: { answer: ans, isCorrect: correct },
        }
        setAnsweredMap(nextAnsweredMap)
        if (correct) correctCountRef.current++
        persistCheckpoint(currentIndex, nextAnsweredMap, eqs.length)
        if (!attId.startsWith('local_')) {
          await upsertAnswer(attId, activeQuestion.id, ans, correct, correct ? 1 : 0)
        }
      }
      setSubmitted(true)
      log('practice_answered', { question_id: activeQuestion.id, correct, answer_given: selectedAnswer })
    } catch (e) {
      console.warn('Answer saved locally:', e)
      persistCheckpoint(currentIndex, nextAnsweredMap, eqs.length)
      setSubmitted(true)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndExit = () => {
    setExiting(true)
    persistCheckpoint(currentIndex, answeredMap, eqs.length)
    log('practice_saved_exit', {
      exam_id: id,
      attempt_id: attemptRef.current?.id,
      current_index: currentIndex,
      answered: answeredCount,
      total: eqs.length,
    })
    navigate('/sheets')
  }

  const handleNext = async () => {
    if (currentIndex < eqs.length - 1) {
      const nextIdx = currentIndex + 1
      setCurrentIndex(nextIdx)
      const nextQid = eqs[nextIdx]?.question.id
      if (nextQid && answeredMap[nextQid]) {
        setSelectedAnswer(answeredMap[nextQid].answer)
        setSubmitted(true)
      } else {
        setSelectedAnswer(null)
        setSubmitted(false)
      }
      persistCheckpoint(nextIdx, answeredMap, eqs.length)
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
      if (user && id) {
        clearPracticeCheckpoint(user.id, id)
      }
      navigate(`/results/${attId}`)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Watermark
        label={user?.user_metadata?.full_name ?? user?.email ?? 'Student'}
        sublabel={user?.email}
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-text">{exam.title}</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Scratchpad />
          <CartesianGrapherModal
            onInsertAnswer={(summary) => {
              if (activeQuestion.type === 'short_answer' && !submitted) {
                setSelectedAnswer(summary)
              }
            }}
          />
          <button
            type="button"
            onClick={handleSaveAndExit}
            disabled={exiting || saving}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text hover:border-brand hover:text-brand transition disabled:opacity-50"
          >
            💾 Save & Exit
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Question <strong className="text-text">{currentIndex + 1}</strong> of {eqs.length}
          </span>
          <span className="font-semibold text-brand">
            {answeredCount} / {eqs.length} answered ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Practice sheet progress"
          />
        </div>
      </div>

      {resumedInfo && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-brand/25 bg-brand/5 px-3.5 py-2 text-xs text-ink">
          <span>
            ✨ Resumed where you left off ({resumedInfo.answeredCount} / {eqs.length} answered). Your progress saves automatically.
          </span>
          <button
            type="button"
            onClick={() => setResumedInfo(null)}
            className="ml-2 font-bold text-brand hover:underline"
            aria-label="Dismiss resumed notice"
          >
            Dismiss
          </button>
        </div>
      )}

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
