import { useEffect, useMemo, useState } from 'react'

/**
 * Subtle Forensic Watermark + Hard Print/PDF Block + Screenshot Deterrence.
 *
 * - On screen: ultra-faint sparse diagonal identity stamps (opacity 0.015) + tidy
 *   bottom-right micro-stamp so math equations stay crisp and unobstructed.
 * - Print / Save-as-PDF: hard `@media print` blackout hides the entire assessment
 *   and outputs only a protected-content notice.
 * - Keyboard / Context deterrence: blocks Ctrl/Cmd+P, Ctrl/Cmd+S, right-click,
 *   and triggers a brief privacy curtain on PrintScreen.
 *   (Note: OS/hardware screenshots cannot be 100% blocked by any web browser,
 *   so the subtle traceable student identity stamp stays active.)
 */
export default function Watermark({
  label,
  sublabel,
}: {
  label: string
  sublabel?: string
}) {
  const [curtainMessage, setCurtainMessage] = useState<string | null>(null)

  const timestamp = useMemo(() => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    return `${now.toISOString().slice(0, 10)} ${hh}:${mm}`
  }, [])

  const identity = sublabel && sublabel !== label ? `${label} (${sublabel})` : label

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const flashCurtain = (msg: string) => {
      setCurtainMessage(msg)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setCurtainMessage(null), 2400)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && (key === 'p' || key === 's')) {
        e.preventDefault()
        e.stopPropagation()
        flashCurtain('Printing and PDF saving are disabled for protected assessments.')
        return
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        flashCurtain('Screenshots are discouraged — this session is watermarked with your identity.')
        try {
          navigator.clipboard?.writeText?.('')
        } catch {
          // Ignore clipboard permission errors
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        flashCurtain('Screenshots are discouraged — this session is watermarked with your identity.')
      }
    }

    const onBeforePrint = (e: Event) => {
      e.preventDefault?.()
      flashCurtain('Printing and PDF export are disabled for protected assessments.')
    }

    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('math-field'))) {
        return
      }
      e.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('beforeprint', onBeforePrint)
    document.addEventListener('contextmenu', onContextMenu)
    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('beforeprint', onBeforePrint)
      document.removeEventListener('contextmenu', onContextMenu)
    }
  }, [])

  return (
    <>
      {/* Ultra-subtle sparse diagonal watermark (keeps math 100% readable) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none opacity-[0.015]"
        style={{ transform: 'rotate(-24deg) scale(1.25)' }}
      >
        <div className="grid h-full w-full grid-cols-2 place-items-center gap-24 p-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-[11px] font-semibold tracking-widest text-ink"
            >
              © The Math Mentor · {identity} · {timestamp}
            </span>
          ))}
        </div>
      </div>

      {/* Discreet corner micro-stamp */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-2 right-3 z-20 select-none text-[10px] font-medium text-text-muted/40"
      >
        © The Math Mentor · {identity} · {timestamp}
      </div>

      {/* Temporary privacy curtain on PrintScreen / Ctrl+P / Ctrl+S */}
      {curtainMessage && (
        <div
          role="alert"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-dark/95 p-6 text-center text-white backdrop-blur-md"
        >
          <div className="max-w-md space-y-2 rounded-2xl border border-accent-gold/40 bg-brand-dark p-6">
            <p className="font-display text-xl font-bold text-accent-gold">Protected Assessment</p>
            <p className="text-sm text-white/85">{curtainMessage}</p>
          </div>
        </div>
      )}

      {/* Hard Print / Save-as-PDF Blackout */}
      <div className="mm-print-blocked-notice hidden">
        Protected Assessment — Printing and PDF export are disabled by The Math Mentor. ({identity} · {timestamp})
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .mm-print-blocked-notice,
          .mm-print-blocked-notice * {
            display: flex !important;
            visibility: visible !important;
            position: fixed !important;
            inset: 0 !important;
            align-items: center !important;
            justify-content: center !important;
            background: #ffffff !important;
            color: #1A1A2E !important;
            font-size: 18px !important;
            font-weight: 700 !important;
            padding: 2rem !important;
            text-align: center !important;
            z-index: 99999 !important;
          }
        }
      `}</style>
    </>
  )
}
