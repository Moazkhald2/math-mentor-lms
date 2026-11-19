import { useEffect, useState, type ReactNode } from 'react'
import { useAntiCheat, type AntiCheatConfig } from '../hooks/useAntiCheat'

interface Props extends AntiCheatConfig {
  children: ReactNode
  onTimeUp?: () => void
  durationMinutes?: number
}

export default function AntiCheatGuard({ children, onTimeUp, durationMinutes, ...config }: Props) {
  const { warningCount, isDisqualified, timeSpent, isFullscreen, requestFullscreen } =
    useAntiCheat(config)
  const [blurred, setBlurred] = useState(false)

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

  useEffect(() => {
    if (durationMinutes && timeSpent >= durationMinutes * 60) {
      onTimeUp?.()
    }
  }, [timeSpent, durationMinutes, onTimeUp])

  const remaining = durationMinutes ? durationMinutes * 60 - timeSpent : 0
  const remainingMin = Math.floor(remaining / 60)
  const remainingSec = remaining % 60
  const isLowTime = durationMinutes ? remaining <= 300 : false // warn under 5 min

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <div className="rounded-lg border border-warning bg-warning/10 px-3 py-1.5 text-xs text-warning">
              ⚠ Click fullscreen to start
              <button onClick={requestFullscreen} className="ml-1 underline hover:no-underline">Fullscreen</button>
            </div>
          )}
          {warningCount > 0 && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger">
              ⚠ Violations: {warningCount}/{config.maxWarnings ?? 3}
            </div>
          )}
        </div>

        {durationMinutes && durationMinutes > 0 && (
          <div className={`flex items-baseline gap-2 rounded-xl border px-4 py-2 ${
            isLowTime
              ? 'border-danger bg-danger/10 text-danger animate-pulse'
              : 'border-border bg-secondary text-primary'
          }`}>
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Time left</span>
            <span className="text-3xl font-extrabold tabular-nums tracking-tight" aria-live="off">
              {remainingMin}:{String(remainingSec).padStart(2, '0')}
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
