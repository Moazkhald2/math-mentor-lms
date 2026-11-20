import { useEffect, useState, type ReactNode } from 'react'
import { useAntiCheat, type AntiCheatConfig } from '../hooks/useAntiCheat'
import {
  computeRemainingSecondsFromDeadline,
  formatMinutesOnly,
  getTimerUrgency,
} from '../lib/examTiming'

interface Props extends AntiCheatConfig {
  children: ReactNode
  onTimeUp?: () => void
  durationMinutes?: number
  /** Server-anchored ISO deadline for offline-resilient timing (Step 17) */
  deadlineIso?: string | null
  /** Full exam duration in minutes used to compute calm -> amber -> urgent thresholds */
  totalDurationMinutes?: number
}

export default function AntiCheatGuard({
  children,
  onTimeUp,
  durationMinutes,
  deadlineIso,
  totalDurationMinutes,
  ...config
}: Props) {
  const { warningCount, isDisqualified, timeSpent, isFullscreen, requestFullscreen } =
    useAntiCheat(config)
  const [blurred, setBlurred] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Keep offline-resilient wall-clock tick synced with server-anchored deadline
  useEffect(() => {
    if (!deadlineIso) return
    const tick = setInterval(() => setNowMs(Date.now()), 1000)
    const onResume = () => setNowMs(Date.now())
    window.addEventListener('online', onResume)
    window.addEventListener('focus', onResume)
    return () => {
      clearInterval(tick)
      window.removeEventListener('online', onResume)
      window.removeEventListener('focus', onResume)
    }
  }, [deadlineIso])

  // Auto-apply fullscreen when entering the exam
  useEffect(() => {
    if (!isFullscreen && typeof requestFullscreen === 'function') {
      try {
        requestFullscreen()
      } catch {}
    }
  }, [isFullscreen, requestFullscreen])

  // Privacy screen: hide exam content when the tab/window loses focus.
  // The underlying blur/focus events still feed the violation counter.
  useEffect(() => {
    const update = () => setBlurred(document.visibilityState === 'hidden' || !document.hasFocus())
    document.addEventListener('visibilitychange', update)
    window.addEventListener('blur', update)
    window.addEventListener('focus', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('blur', update)
      window.removeEventListener('focus', update)
    }
  }, [])

  const remainingSecTotal = deadlineIso
    ? computeRemainingSecondsFromDeadline(deadlineIso, nowMs)
    : durationMinutes
      ? Math.max(0, Math.floor(durationMinutes * 60 - timeSpent))
      : 0

  useEffect(() => {
    const hasTimer = Boolean(deadlineIso || (durationMinutes && durationMinutes > 0))
    if (hasTimer && remainingSecTotal <= 0) {
      onTimeUp?.()
    }
  }, [deadlineIso, durationMinutes, remainingSecTotal, onTimeUp])

  const totalSecForUrgency = (totalDurationMinutes ?? durationMinutes ?? 0) * 60
  const timeDisplay = formatMinutesOnly(remainingSecTotal)
  const urgency = getTimerUrgency(remainingSecTotal, totalSecForUrgency)

  const timerToneClasses =
    urgency === 'urgent'
      ? 'border-danger bg-terra-light text-terra-dark dark:bg-danger/15 dark:text-danger'
      : urgency === 'amber'
        ? 'border-accent-gold bg-gold-light text-gold-dark dark:bg-accent-gold/15 dark:text-accent-gold'
        : 'border-brand/35 bg-teal-light/60 text-brand-light dark:bg-brand/15 dark:text-brand'

  if (isDisqualified) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-xl border border-danger bg-danger/10 p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-danger">Exam Disqualified</h2>
          <p className="text-muted">
            Too many violations detected. This exam has been automatically submitted.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Auto Fullscreen Guard Modal if browser blocked direct auto-entry */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="max-w-md w-full rounded-2xl border border-brand/50 bg-surface p-6 text-center shadow-2xl space-y-4">
            <div className="text-4xl animate-pulse">🛡️</div>
            <h2 className="text-xl font-black text-ink">Secure Fullscreen Exam Mode</h2>
            <p className="text-sm text-text-muted">
              To ensure academic integrity, this exam must be taken in full screen mode.
            </p>
            <button
              type="button"
              onClick={requestFullscreen}
              className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-light transition active:scale-95"
            >
              Enter Fullscreen & Begin Exam
            </button>
          </div>
        </div>
      )}

      {/* Header bar: fullscreen warning + timer + violations */}
      <div className="mb-2 md:mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!isFullscreen && (
            <div className="rounded-lg border border-warning bg-warning/10 px-2.5 py-1 text-xs text-warning">
              ⚠ Click fullscreen to start
              <button onClick={requestFullscreen} className="ml-1 underline hover:no-underline">Fullscreen</button>
            </div>
          )}
          {warningCount > 0 && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs text-danger">
              ⚠ Violations: {warningCount}/{config.maxWarnings ?? 3}
            </div>
          )}
        </div>

        {((durationMinutes && durationMinutes > 0) || deadlineIso) && (
          <div
            data-timer-urgency={urgency}
            className={`flex items-baseline gap-2 rounded-xl border px-3 py-1 transition-colors duration-300 md:px-4 md:py-1.5 ${timerToneClasses}`}
          >
            <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">Time left</span>
            <span className="text-lg md:text-2xl font-extrabold tabular-nums tracking-tight" aria-live="off">
              {timeDisplay}
            </span>
          </div>
        )}
      </div>

      {children}

      {blurred && (
        <button
          onClick={() => setBlurred(false)}
          className="fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center gap-2 bg-surface/95 backdrop-blur-sm"
          aria-label="Return to exam"
        >
          <span className="font-display text-2xl font-bold text-ink">Screen paused</span>
          <span className="text-sm text-text-muted">Click anywhere to continue your exam</span>
        </button>
      )}
    </div>
  )
}
