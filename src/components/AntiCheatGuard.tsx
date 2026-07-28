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
      {!isFullscreen && (
        <div className="mb-4 rounded-lg border border-accent-gold bg-accent-gold/10 px-4 py-2 text-sm text-accent-gold">
          ⚠ Enter fullscreen mode to start the exam.
          <button
            onClick={requestFullscreen}
            className="ml-2 underline hover:no-underline"
          >
            Fullscreen
          </button>
        </div>
      )}

      {warningCount > 0 && (
        <div className="mb-4 rounded-lg border border-accent-gold/20 bg-accent-gold/5 px-4 py-2 text-sm text-accent-gold">
          ⚠ Warning {warningCount} — leaving the exam window is not allowed.
        </div>
      )}

      {children}
    </div>
  )
}
