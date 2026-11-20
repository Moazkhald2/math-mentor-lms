/**
 * Step 17 — Colour-Shifting Exam Timer (Minutes-Only), Offline Timer Resilience
 * & Per-Question Speed Insights (Draft 1 §15 & v3.0 Step 17)
 */

export type TimerUrgency = 'calm' | 'amber' | 'urgent'

export interface PersistedExamDeadline {
  attemptId: string
  deadlineIso: string
  totalSeconds: number
}

export interface QuestionTimingInsight {
  questionId: string
  seconds: number
  isCorrect: boolean
  label: string
  tone: 'positive' | 'gentle' | 'neutral'
}

export interface SpeedSummary {
  trackedCount: number
  totalSeconds: number
  averageSeconds: number
  rushedMistakesCount: number
  slowCorrectCount: number
  headline: string
  tip: string
  perQuestion: Record<string, QuestionTimingInsight>
}

const DEADLINE_PREFIX = 'mm_exam_deadline_'
const TIMING_PREFIX = 'mm_exam_qtime_'

/**
 * Classifies remaining exam time into calm (teal/blue), amber (<= 25% or <= 10 min),
 * or urgent terracotta/red (<= 10% or <= 5 min).
 */
export function getTimerUrgency(remainingSeconds: number, totalSeconds: number): TimerUrgency {
  if (totalSeconds <= 0) return 'calm'
  const ratio = remainingSeconds / totalSeconds
  if (remainingSeconds <= 300 || ratio <= 0.1) return 'urgent'
  if (remainingSeconds <= 600 || ratio <= 0.25) return 'amber'
  return 'calm'
}

/**
 * Preserves the locked minutes-only exam display (zero seconds / sub-seconds shown).
 */
export function formatMinutesOnly(remainingSeconds: number): string {
  const safe = Math.max(0, Math.floor(remainingSeconds))
  if (safe <= 0) return '0 min'
  if (safe < 60) return '< 1 min'
  return `${Math.ceil(safe / 60)} min`
}

export function persistExamDeadline(data: PersistedExamDeadline): void {
  try {
    localStorage.setItem(`${DEADLINE_PREFIX}${data.attemptId}`, JSON.stringify(data))
  } catch {
    // Ignore storage quota errors
  }
}

export function loadExamDeadline(attemptId: string): PersistedExamDeadline | null {
  try {
    const raw = localStorage.getItem(`${DEADLINE_PREFIX}${attemptId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedExamDeadline
    if (!parsed || parsed.attemptId !== attemptId || !parsed.deadlineIso) return null
    return parsed
  } catch {
    return null
  }
}

export function clearExamDeadline(attemptId: string): void {
  try {
    localStorage.removeItem(`${DEADLINE_PREFIX}${attemptId}`)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Computes authoritative remaining seconds from an ISO deadline string,
 * resilient to offline periods, tab sleep, and browser refresh.
 */
export function computeRemainingSecondsFromDeadline(deadlineIso: string, nowMs: number = Date.now()): number {
  const deadlineMs = new Date(deadlineIso).getTime()
  if (Number.isNaN(deadlineMs)) return 0
  return Math.max(0, Math.floor((deadlineMs - nowMs) / 1000))
}

export function saveQuestionTimings(attemptId: string, timings: Record<string, number>): void {
  try {
    localStorage.setItem(`${TIMING_PREFIX}${attemptId}`, JSON.stringify(timings))
  } catch {
    // Ignore storage errors
  }
}

export function loadQuestionTimings(attemptId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${TIMING_PREFIX}${attemptId}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const clean: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        clean[k] = Math.round(v)
      }
    }
    return clean
  } catch {
    return {}
  }
}

export function formatDurationCompact(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`
}

/**
 * Produces kind, constructive pacing feedback for Results.tsx (Draft 1 §15).
 */
export function analyzeQuestionSpeeds(
  timings: Record<string, number>,
  answers: Array<{ question_id: string; is_correct: boolean }>
): SpeedSummary | null {
  const entries = answers
    .map((a) => ({
      questionId: a.question_id,
      isCorrect: a.is_correct,
      seconds: timings[a.question_id],
    }))
    .filter((e): e is { questionId: string; isCorrect: boolean; seconds: number } => typeof e.seconds === 'number' && e.seconds > 0)

  if (entries.length === 0) return null

  const totalSeconds = entries.reduce((sum, e) => sum + e.seconds, 0)
  const averageSeconds = Math.round(totalSeconds / entries.length)
  const perQuestion: Record<string, QuestionTimingInsight> = {}

  let rushedMistakesCount = 0
  let slowCorrectCount = 0

  for (const e of entries) {
    const isVeryFast = e.seconds < Math.min(15, averageSeconds * 0.45)
    const isLonger = e.seconds > Math.max(90, averageSeconds * 1.8)

    if (!e.isCorrect && isVeryFast) {
      rushedMistakesCount += 1
      perQuestion[e.questionId] = {
        questionId: e.questionId,
        seconds: e.seconds,
        isCorrect: false,
        label: 'Quick try — double-checking can turn slips into marks',
        tone: 'gentle',
      }
    } else if (e.isCorrect && isLonger) {
      slowCorrectCount += 1
      perQuestion[e.questionId] = {
        questionId: e.questionId,
        seconds: e.seconds,
        isCorrect: true,
        label: 'Thoughtful persistence paid off',
        tone: 'positive',
      }
    } else if (!e.isCorrect && isLonger) {
      perQuestion[e.questionId] = {
        questionId: e.questionId,
        seconds: e.seconds,
        isCorrect: false,
        label: 'Tricky spot — worth reviewing this step',
        tone: 'gentle',
      }
    } else {
      perQuestion[e.questionId] = {
        questionId: e.questionId,
        seconds: e.seconds,
        isCorrect: e.isCorrect,
        label: e.isCorrect ? 'Steady, confident pace' : 'Good effort — review the solution',
        tone: e.isCorrect ? 'positive' : 'neutral',
      }
    }
  }

  let headline = 'Steady, balanced pacing'
  let tip = 'You spent a healthy amount of time per question. Keep reading each prompt carefully.'

  if (rushedMistakesCount >= 2) {
    headline = 'A few questions went by quickly'
    tip = `You missed ${rushedMistakesCount} questions in under 15 seconds. Pausing to check signs and units before moving on can boost your score right away.`
  } else if (slowCorrectCount >= 1) {
    headline = 'Patience paid off on tougher problems'
    tip = 'Taking extra time on harder questions helped you earn accurate marks. Keep using that calm focus!'
  }

  return {
    trackedCount: entries.length,
    totalSeconds,
    averageSeconds,
    rushedMistakesCount,
    slowCorrectCount,
    headline,
    tip,
    perQuestion,
  }
}
