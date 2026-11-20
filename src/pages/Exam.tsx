import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  fetchExamQuestionsSafe,
  startAttempt,
  saveAnswersBatch,
  submitExamSecure,
  fetchStudentAttempts,
  cooldownRemainingMs,
  getBestScore,
} from '../lib/exams'
import { claimActiveSession, signOutOtherDevicesAndClaim } from '../lib/session'
import { supabase } from '../lib/supabase'
import { seededShuffle, shuffleOptionsPreservingIndex } from '../lib/shuffle'
import { applySafeTemplate } from '../lib/params'
import { resolveVariant } from '../lib/variants'
import AntiCheatGuard from '../components/AntiCheatGuard'
import Watermark from '../components/Watermark'
import DifficultyBadge from '../components/DifficultyBadge'
import { useActivityLogger } from '../hooks/useActivityLogger'
import LatexRenderer from '../components/LatexRenderer'
import Scratchpad from '../components/Scratchpad'
import CartesianGrapherModal from '../components/CartesianGrapherModal'
import MathInput from '../components/MathInput'
import type { Exam, SafeExamQuestionRow, SafeQuestion } from '../types'

interface ShuffledOption {
  text: string
  originalIndex: number
}

type RenderExamQuestion = Omit<SafeExamQuestionRow, 'question'> & {
  question: SafeQuestion
  shuffledOptions: ShuffledOption[]
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
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null)
  const [sessionConflict, setSessionConflict] = useState<{ otherDevice?: string; lastSeen?: string } | null>(null)
  const [switchingDevice, setSwitchingDevice] = useState(false)
  const startedRef = useRef(false)
  const submittingRef = useRef(false)

  const offlineKey = id ? `mm_answers_${id}_${user?.id ?? 'guest'}` : ''

  // Auto-apply fullscreen when entering the exam
  useEffect(() => {
    if (!document.fullscreenElement) {
      try {
        document.documentElement.requestFullscreen().catch(() => {})
      } catch {}
    }
  }, [])

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); setOfflineNotice(null) }
    const onOffline = () => { setIsOnline(false); setOfflineNotice('Offline - answers saved on device, will sync when back online') }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  useEffect(() => {
    if (!offlineKey) return
    try {
      const raw = localStorage.getItem(offlineKey)
      if (raw) setAnswers(JSON.parse(raw))
    } catch {}
  }, [offlineKey])

  useEffect(() => {
    if (!offlineKey || Object.keys(answers).length === 0) return
    try { localStorage.setItem(offlineKey, JSON.stringify(answers)) } catch {}
  }, [answers, offlineKey])

  const { data: exam, error: examError } = useQuery({
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

  // Claim active session and start/resume an authorized server-validated attempt BEFORE loading exam questions
  useEffect(() => {
    if (!user || !id || startedRef.current || !exam || attemptsLoading) return
    if (gate) {
      startedRef.current = true
      return
    }
    startedRef.current = true
    claimActiveSession(false)
      .then((claimRes) => {
        if (claimRes?.status === 'conflict') {
          setSessionConflict({
            otherDevice: claimRes.other_device ?? 'Another device',
            lastSeen: claimRes.last_seen,
          })
          return null
        }
        log('exam_started', { exam_id: id })
        return startAttempt(id, user.id)
      })
      .then((a) => {
        if (!a) return
        setAttemptId(a.id)
        setAttemptSeed(a.seed ?? null)
      })
      .catch((e: Error) => {
        if (String(e?.message ?? '').includes('session_conflict_other_device')) {
          setSessionConflict({ otherDevice: 'Another device' })
        } else {
          setError(e.message)
        }
      })
  }, [user, id, exam, gate, attemptsLoading, log])

  // Fetch questions ONLY through the server-safe RPC once an active attempt exists and no session conflict.
  // Payload NEVER contains correct_answer, explanation, or common_mistakes.
  const {
    data: safePayload,
    isLoading: questionsLoading,
    error: questionsError,
    refetch: refetchQuestions,
  } = useQuery({
    queryKey: ['exam-questions-safe', id, attemptId],
    queryFn: () => fetchExamQuestionsSafe(id!, attemptId!),
    enabled: !!id && !!attemptId && !sessionConflict,
  })

  useEffect(() => {
    const msg = String((questionsError as Error | null)?.message ?? '')
    if (msg.includes('session_conflict_other_device')) {
      setSessionConflict({ otherDevice: 'Another device' })
    }
  }, [questionsError])

  const handleSwitchDevice = async () => {
    if (!user || !id || switchingDevice) return
    setSwitchingDevice(true)
    setError(null)
    try {
      await signOutOtherDevicesAndClaim()
      setSessionConflict(null)
      if (!attemptId) {
        log('exam_started', { exam_id: id })
        const a = await startAttempt(id, user.id)
        setAttemptId(a.id)
        setAttemptSeed(a.seed ?? null)
      } else {
        await refetchQuestions()
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not switch active session. Please try again.')
    } finally {
      setSwitchingDevice(false)
    }
  }

  const questions = useMemo<RenderExamQuestion[] | undefined>(() => {
    if (!safePayload?.questions) return undefined
    const rawQuestions = safePayload.questions
    const variantPool = safePayload.variants ?? []
    const seed = (attemptSeed ?? attemptId ?? id) || 'default'
    const baseShuffle = exam?.shuffle_questions
      ? seededShuffle(rawQuestions, seed + '_questions')
      : [...rawQuestions]

    return baseShuffle.map(eq => {
      const variant = resolveVariant(eq.question, seed, variantPool)
      const templated = applySafeTemplate(variant, seed + variant.id)
      const shuffledOptions =
        templated.type === 'multiple_choice' && templated.options.length > 0
          ? shuffleOptionsPreservingIndex(templated.options, seed + templated.id)
          : []
      return {
        ...eq,
        question: templated,
        shuffledOptions,
      }
    })
  }, [safePayload, id, attemptId, attemptSeed, exam?.shuffle_questions])

  const remainingDurationMinutes = useMemo(() => {
    if (!exam) return 30
    if (!safePayload?.started_at || !safePayload?.server_now) return exam.time_limit_minutes
    const elapsedMin = Math.max(
      0,
      (new Date(safePayload.server_now).getTime() - new Date(safePayload.started_at).getTime()) / 60000
    )
    return Math.max(0.25, exam.time_limit_minutes - elapsedMin)
  }, [exam, safePayload?.started_at, safePayload?.server_now])

  const current = questions?.[currentIndex]
  const total = questions?.length ?? 0
  const answered = Object.keys(answers).length

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSave = useCallback(async () => {
    if (!attemptId || saving || answered === 0) return
    if (!navigator.onLine) {
      setOfflineNotice('Offline - saved on device, will sync when online')
      return
    }
    setSaving(true)
    try {
      await saveAnswersBatch(attemptId, answers)
      log('exam_saved', { answered })
      if (offlineKey) localStorage.removeItem(offlineKey)
    } catch (e: any) {
      try { localStorage.setItem(offlineKey, JSON.stringify(answers)) } catch {}
      if (String(e?.message ?? '').includes('session_conflict_other_device')) {
        setSessionConflict({ otherDevice: 'Another device' })
      } else {
        setOfflineNotice(`Save failed (${e?.message ?? 'network'}) - kept safely on device`)
      }
    } finally {
      setSaving(false)
    }
  }, [attemptId, saving, answered, answers, log, offlineKey])

  // Server-authoritative submission ONLY — never grades in browser or writes scores directly
  const handleSubmit = useCallback(async () => {
    if (!attemptId || !questions || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const secureResult = await submitExamSecure(attemptId, answers)
      if (offlineKey) localStorage.removeItem(offlineKey)
      log('exam_submitted', { score: secureResult.score, total: questions.length })
      queryClient.invalidateQueries({ queryKey: ['my-exam-attempts', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['my-exam-attempts', id] })
      navigate(`/results/${attemptId}`, { replace: true })
    } catch (e: any) {
      const msg = String(e?.message ?? '')
      if (msg.includes('session_conflict_other_device')) {
        setSessionConflict({ otherDevice: 'Another device' })
        submittingRef.current = false
        setSubmitting(false)
        return
      }
      if (msg.includes('attempt_already_submitted') || msg.includes('23505')) {
        if (offlineKey) localStorage.removeItem(offlineKey)
        navigate(`/results/${attemptId}`, { replace: true })
        return
      }
      setError(msg || 'Submission failed. Your answers are still saved on this device.')
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [attemptId, questions, answers, navigate, log, queryClient, user?.id, id, offlineKey])

  const handleTimeUp = useCallback(() => {
    if (!submittingRef.current) handleSubmit()
  }, [handleSubmit])

  useEffect(() => {
    if (!isOnline || !attemptId || Object.keys(answers).length === 0) return
    const t = setTimeout(() => { handleSave() }, 3000)
    return () => clearTimeout(t)
  }, [isOnline, attemptId, handleSave])

  const handleSubmitClick = () => {
    if (!questions) return
    const unanswered = questions.filter(q => !(q.question.id in answers)).length
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

  if (sessionConflict) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-warning/40 bg-surface p-8 text-center shadow-lg">
        <div className="mb-3 text-4xl" aria-hidden="true">📱</div>
        <h2 className="text-xl font-black text-ink">Active Session on Another Device</h2>
        <p className="mt-2 text-sm text-text-muted">
          Your account is currently active on <strong>{sessionConflict.otherDevice || 'another device'}</strong>.
          To protect exam integrity, only one device can take an exam at a time.
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Your saved answers are safe. Click below to sign out the other device and continue right here.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSwitchDevice}
            disabled={switchingDevice}
            className="w-full rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-light disabled:opacity-50"
          >
            {switchingDevice ? 'Switching device...' : 'Sign out other device & continue here'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/exams')}
            className="w-full rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-text-muted hover:text-ink"
          >
            Back to Exams
          </button>
        </div>
      </div>
    )
  }

  const activeError = error ?? (examError as Error | null)?.message ?? (questionsError as Error | null)?.message ?? null

  if (activeError) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <p className="text-lg text-danger">{activeError}</p>
        <button onClick={() => navigate('/exams')} className="mt-4 rounded-lg bg-brand px-6 py-2 text-white">Back to Exams</button>
      </div>
    )
  }

  if (questionsLoading || (attemptsLoading && !!user) || (!!user && !!exam && !gate && !attemptId)) {
    return <p className="mt-16 text-center text-text-muted">Loading exam...</p>
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
      durationMinutes={remainingDurationMinutes}
      onTimeUp={handleTimeUp}
      onDisqualified={handleTimeUp}
      onViolation={(type) => log('violation', { type })}
    >
      <div className="mx-auto max-w-3xl px-2 md:px-0">
        <Watermark
          label={user?.user_metadata?.full_name ?? user?.email ?? 'Student'}
          sublabel={user?.email}
        />
        {!isOnline && (
          <div className="mb-4 rounded-lg border border-warning bg-warning/10 px-4 py-2 text-sm text-warning">
            Offline - exam paused, answers saved on device. Will sync when back online.
          </div>
        )}
        {offlineNotice && isOnline && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2 text-sm text-warning">
            {offlineNotice}
          </div>
        )}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink">
            Question {currentIndex + 1} <span className="font-normal text-text-muted">of {total}</span>
            {answered > 0 && <span className="ml-2 text-xs text-text-muted">· {answered} answered</span>}
          </span>
          <div className="mx-4 h-1.5 min-w-[120px] flex-1 rounded-full bg-surface-light">
            <div
              className="h-1.5 rounded-full bg-brand transition-all duration-300"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
          <Scratchpad />
          <CartesianGrapherModal
            onInsertAnswer={(summary) => {
              if (current?.question?.type === 'short_answer') {
                handleAnswer(current.question.id, summary)
              }
            }}
          />
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
            shuffledOptions={current.shuffledOptions}
            index={currentIndex}
            total={total}
            selected={answers[current.question.id]}
            onAnswer={(a) => handleAnswer(current.question.id, a)}
            onNext={() => setCurrentIndex(i => Math.min(i + 1, total - 1))}
            onPrev={() => setCurrentIndex(i => Math.max(i - 1, 0))}
          />
        )}

        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-2xl">
              <h2 className="mb-4 text-2xl font-black text-text">Submit Exam?</h2>
              <p className="mb-2 text-text-muted">
                You have {questions.filter(q => !(q.question.id in answers)).length} unanswered question(s).
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
  question, shuffledOptions, index, total, selected, onAnswer, onNext, onPrev,
}: {
  question: SafeQuestion
  shuffledOptions: ShuffledOption[]
  index: number
  total: number
  selected?: string
  onAnswer: (answer: string) => void
  onNext: () => void
  onPrev: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 md:p-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-semibold text-brand">Q{index + 1} / {total}</span>
        <DifficultyBadge level={question.difficulty} />
      </div>

      {question.image_url && (
        <div className="mb-6 flex justify-center">
          <img src={question.image_url} alt="Diagram" className="max-h-64 rounded-lg" />
        </div>
      )}

      <div className="mb-6 md:mb-8 select-none text-base md:text-lg font-medium leading-relaxed text-text">
        <LatexRenderer content={question.question_text} />
      </div>

      <div className="space-y-3">
        {question.type === 'multiple_choice' && shuffledOptions.map((opt, displayIdx) => {
          const val = String(opt.originalIndex)
          return (
            <button key={opt.originalIndex} onClick={() => onAnswer(val)}
              className={`w-full select-none rounded-lg border px-5 py-3 text-left transition ${
                selected === val ? 'border-brand bg-brand/10 text-text' : 'border-border text-text-muted hover:border-brand/50 hover:text-text'
              }`}
            >
              <span className="mr-3 font-mono text-sm text-text-muted">{String.fromCharCode(65 + displayIdx)}.</span>
              <LatexRenderer content={opt.text} />
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
          <MathInput
            value={selected ?? ''}
            onChange={val => onAnswer(val)}
            placeholder="Type your answer..."
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
