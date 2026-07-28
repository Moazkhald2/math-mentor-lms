import { useEffect, type ReactNode } from 'react'
import { useAntiCheat, type AntiCheatConfig } from '../hooks/useAntiCheat'

interface Props extends AntiCheatConfig {
  children: ReactNode
  onTimeUp?: () => void
  durationMinutes?: number
}

export default function AntiCheatGuard({ children, onTimeUp, durationMinutes, ...config }: Props) {
  const { warningCount, isDisqualified, timeSpent, isFullscreen, requestFullscreen } =
    useAntiCheat(config)

  useEffect(() => {
    requestFullscreen()
  }, [requestFullscreen])

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
          <p className="text-text-muted">
            Too many violations detected. This exam has been automatically submitted.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Header bar: fullscreen warning + timer + violations */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <div className="rounded-lg border border-accent-gold bg-accent-gold/10 px-3 py-1.5 text-xs text-accent-gold">
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
          <div className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${
            isLowTime
              ? 'border-danger bg-danger/10 text-danger animate-pulse'
              : 'border-border bg-surface text-text'
          }`}>
            {isLowTime ? '⏰ ' : '⏱ '}
            {remainingMin}:{String(remainingSec).padStart(2, '0')}
          </div>
        )}
      </div>

      {children}
    </div>
  )
}
