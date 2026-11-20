import { useState } from 'react'
import { Award, CheckCircle2, Compass, Flame, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import {
  computeDailyStreak,
  computeEffortBadges,
  isGamificationEnabled,
  setGamificationEnabled,
  type EffortBadge,
  type EffortMetricsInput,
} from '../lib/gamification'

interface OptInRewardsCardProps {
  userId: string
  metrics: EffortMetricsInput
}

function BadgeIcon({ id, earned }: { id: EffortBadge['id']; earned: boolean }) {
  const cls = `h-5 w-5 ${earned ? 'text-brand' : 'text-text-muted'}`
  switch (id) {
    case 'fixed_mistake':
      return <RefreshCw className={cls} aria-hidden="true" />
    case 'consistent_learner':
      return <Flame className={cls} aria-hidden="true" />
    case 'perfect_score':
      return <Award className={cls} aria-hidden="true" />
    case 'independent_solver':
      return <Compass className={cls} aria-hidden="true" />
    case 'sheet_finisher':
      return <CheckCircle2 className={cls} aria-hidden="true" />
  }
}

/**
 * Strictly Opt-In Streaks & Effort Badges (v3.0 Step 16)
 * Default OFF. Device-local preference. Never used for grading or behavioral profiling.
 */
export default function OptInRewardsCard({ userId, metrics }: OptInRewardsCardProps) {
  const [enabled, setEnabled] = useState(() => isGamificationEnabled(userId))

  const toggle = (next: boolean) => {
    setGamificationEnabled(userId, next)
    setEnabled(next)
  }

  if (!enabled) {
    return (
      <section className="mb-8 rounded-2xl border border-dashed border-border bg-paper p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-ink">
              <Sparkles className="h-4 w-4 text-accent-gold" aria-hidden="true" />
              <span>Optional Motivation: Streaks & Effort Badges</span>
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                Off by default
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent-green" aria-hidden="true" />
              Personal encouragement only — stored on your device, never used for grading or behavioral profiling.
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggle(true)}
            className="shrink-0 rounded-lg border border-brand bg-brand/5 px-4 py-2 text-xs font-bold text-brand transition hover:bg-brand hover:text-white"
          >
            Turn On Motivation
          </button>
        </div>
      </section>
    )
  }

  const streak = computeDailyStreak(metrics.completedAttemptDates)
  const badges = computeEffortBadges(metrics)
  const earnedCount = badges.filter((b) => b.earned).length

  return (
    <section className="mb-8 rounded-2xl border border-border bg-surface p-6 shadow-xs">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-ink">
            Your Learning Rhythm & Effort Badges
          </h2>
          <p className="text-xs text-text-muted">
            Opt-in personal encouragement &middot; {earnedCount} of {badges.length} effort badges earned
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-accent-gold/40 bg-gold-light px-3.5 py-2 dark:bg-accent-gold/10">
            <Flame className="h-5 w-5 text-accent-gold" aria-hidden="true" />
            <div className="leading-tight">
              <p className="text-sm font-extrabold text-ink">
                {streak.currentStreak} day{streak.currentStreak === 1 ? '' : 's'}
              </p>
              <p className="text-[11px] text-text-muted">Best: {streak.bestStreak}d</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggle(false)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:border-danger hover:text-danger"
          >
            Turn Off
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`flex items-start gap-3 rounded-xl border p-3.5 transition ${
              badge.earned
                ? 'border-brand/40 bg-teal-light/60 dark:bg-brand/10'
                : 'border-border bg-paper/60 opacity-80 dark:bg-tertiary/40'
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                badge.earned
                  ? 'border-brand/30 bg-surface'
                  : 'border-border bg-surface/60'
              }`}
            >
              <BadgeIcon id={badge.id} earned={badge.earned} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-ink">{badge.title}</p>
                {badge.earned && (
                  <span className="rounded-full bg-accent-green/20 px-1.5 py-0.5 text-[10px] font-bold text-sage-dark dark:text-accent-green">
                    Earned
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-text-muted">{badge.description}</p>
              <p className="mt-1 text-[11px] font-semibold text-brand">{badge.progressLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
