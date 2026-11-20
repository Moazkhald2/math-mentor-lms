import { useMemo } from 'react'

/**
 * Dynamic identity watermark (deterrence layer — NOT hard browser DRM).
 * Renders a subtle diagonal tiled watermark on-screen (low opacity so math
 * remains crisp) and a stronger watermark on printouts, carrying student
 * identity + timestamp to discourage casual screenshot/print sharing.
 */
export default function Watermark({
  label,
  sublabel,
}: {
  label: string
  sublabel?: string
}) {
  const timestamp = useMemo(() => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    return `${now.toISOString().slice(0, 10)} ${hh}:${mm}`
  }, [])

  const identity = sublabel && sublabel !== label ? `${label} (${sublabel})` : label

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none opacity-[0.035] print:opacity-[0.14]"
        style={{ transform: 'rotate(-26deg) scale(1.45)' }}
      >
        <div className="flex h-full w-full flex-wrap content-center justify-center gap-12 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-xs font-bold tracking-widest text-ink"
            >
              © The Math Mentor · {identity} · {timestamp}
            </span>
          ))}
        </div>
      </div>
      <style>{`@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .exam-print-deterrent { display: none !important; } }`}</style>
    </>
  )
}
