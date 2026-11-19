import { useState } from 'react'
import CartesianGrapher from './CartesianGrapher'

interface CartesianGrapherModalProps {
  onInsertAnswer?: (summary: string) => void
  triggerLabel?: string
  className?: string
}

export default function CartesianGrapherModal({
  onInsertAnswer,
  triggerLabel = '📈 Graph Paper',
  className = '',
}: CartesianGrapherModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleInsert = (summary: string) => {
    if (onInsertAnswer) {
      onInsertAnswer(summary)
    }
    setIsOpen(false)
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={triggerLabel}
        title="Open Digital Cartesian Graph Paper & Function Plotter"
        className={`flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-muted hover:border-brand hover:text-brand transition shadow-2xs ${className}`}
      >
        <span>{triggerLabel}</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cartesian Coordinate Grapher"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-fade-in"
        >
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl border border-border bg-surface p-4 sm:p-6 shadow-2xl flex flex-col gap-4 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📈</span>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-ink">
                    Cartesian Coordinate Grapher
                  </h2>
                  <p className="text-xs text-text-muted">
                    Digital graph paper: plot points with snapping, draw multiple lines/functions, and detect intersection points.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Graph Paper"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-bg text-sm font-bold text-text-muted hover:bg-danger/10 hover:text-danger transition"
              >
                ✕
              </button>
            </div>

            {/* Grapher Body */}
            <div className="flex-1 flex justify-center">
              <CartesianGrapher
                width={720}
                height={520}
                onInsertAnswer={onInsertAnswer ? handleInsert : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
