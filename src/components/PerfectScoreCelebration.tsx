import { useState } from 'react'
import { Award, Sparkles, X } from 'lucide-react'

interface PerfectScoreCelebrationProps {
  title: string
  studentName?: string
}

/**
 * Opt-In Full-Mark Celebration (Step 16 — House v2 × Stitch)
 * - Strictly opt-in (caller checks isGamificationEnabled)
 * - Compositor-only reveal respecting prefers-reduced-motion
 * - Includes keyboard-accessible Dismiss button (WCAG 2.2.2)
 */
export default function PerfectScoreCelebration({ title, studentName }: PerfectScoreCelebrationProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <section
      aria-label="Perfect score celebration"
      className="animate-celebration relative mb-8 overflow-hidden rounded-2xl border border-accent-gold/60 bg-brand-dark px-6 py-6 text-white shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent-gold/40 bg-accent-gold/15 text-accent-gold">
            <Award className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-accent-gold/40 bg-accent-gold/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-gold">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              100% Full Mark
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">
              {studentName ? `Outstanding work, ${studentName}.` : 'Outstanding work.'}
            </h2>
            <p className="text-sm text-white/80">
              You earned a full mark on <strong className="text-white">{title}</strong>.{' '}
              <span className="italic text-accent-gold">Learn It. Do It. Own It.</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss celebration banner"
          className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
