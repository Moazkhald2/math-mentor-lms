/**
 * Strictly Opt-In Student Motivation Engine (v3.0 Step 16)
 *
 * Privacy & Ethics Rule:
 * - Gamification is OFF by default and strictly opt-in per user on their device.
 * - Effort badges and streaks are computed purely for personal encouragement;
 *   they are NEVER used for grading, ranking, or behavioral profiling.
 */

export interface StreakSummary {
  currentStreak: number
  bestStreak: number
  activeDaysCount: number
}

export interface EffortBadge {
  id: 'fixed_mistake' | 'consistent_learner' | 'perfect_score' | 'independent_solver' | 'sheet_finisher'
  title: string
  description: string
  earned: boolean
  progressLabel: string
}

export interface EffortMetricsInput {
  completedAttemptDates: string[]
  completedPracticeCount: number
  perfectScoreCount: number
  recoveredMistakesCount: number
  independentAnswersCount: number
}

const OPT_IN_PREFIX = 'mm_gamification_opt_in_'

export function gamificationStorageKey(userId: string): string {
  return `${OPT_IN_PREFIX}${userId}`
}

export function isGamificationEnabled(userId: string | null | undefined): boolean {
  if (!userId) return false
  try {
    return localStorage.getItem(gamificationStorageKey(userId)) === 'true'
  } catch {
    return false
  }
}

export function setGamificationEnabled(userId: string, enabled: boolean): void {
  try {
    localStorage.setItem(gamificationStorageKey(userId), enabled ? 'true' : 'false')
  } catch {
    // Ignore storage errors in restricted environments
  }
}

function toLocalDayKey(isoOrDate: string | Date): string | null {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dayDiff(dayKeyA: string, dayKeyB: string): number {
  const [yA, mA, dA] = dayKeyA.split('-').map(Number)
  const [yB, mB, dB] = dayKeyB.split('-').map(Number)
  const utcA = Date.UTC(yA, mA - 1, dA)
  const utcB = Date.UTC(yB, mB - 1, dB)
  return Math.round((utcB - utcA) / 86_400_000)
}

/**
 * Computes current and best consecutive-day practice streaks from ISO timestamps.
 * Counts today or yesterday as active so a student does not lose their streak
 * before finishing today's session.
 */
export function computeDailyStreak(isoDates: string[], now: Date = new Date()): StreakSummary {
  const uniqueDays = Array.from(
    new Set(
      isoDates
        .map((d) => toLocalDayKey(d))
        .filter((k): k is string => Boolean(k))
    )
  ).sort()

  if (uniqueDays.length === 0) {
    return { currentStreak: 0, bestStreak: 0, activeDaysCount: 0 }
  }

  let bestStreak = 1
  let run = 1
  for (let i = 1; i < uniqueDays.length; i++) {
    if (dayDiff(uniqueDays[i - 1], uniqueDays[i]) === 1) {
      run += 1
      if (run > bestStreak) bestStreak = run
    } else {
      run = 1
    }
  }

  const todayKey = toLocalDayKey(now)!
  const lastActiveDay = uniqueDays[uniqueDays.length - 1]
  const gapToToday = dayDiff(lastActiveDay, todayKey)

  let currentStreak = 0
  if (gapToToday <= 1) {
    currentStreak = 1
    for (let i = uniqueDays.length - 1; i > 0; i--) {
      if (dayDiff(uniqueDays[i - 1], uniqueDays[i]) === 1) {
        currentStreak += 1
      } else {
        break
      }
    }
  }

  return {
    currentStreak,
    bestStreak,
    activeDaysCount: uniqueDays.length,
  }
}

/**
 * Derives effort- and growth-focused badges (Draft 1 §14 & v3.0 Step 16).
 */
export function computeEffortBadges(input: EffortMetricsInput, now: Date = new Date()): EffortBadge[] {
  const streak = computeDailyStreak(input.completedAttemptDates, now)

  return [
    {
      id: 'fixed_mistake',
      title: 'Fixed a Mistake',
      description: 'Recovered from a miss by solving a similar problem.',
      earned: input.recoveredMistakesCount >= 1,
      progressLabel:
        input.recoveredMistakesCount >= 1
          ? `${input.recoveredMistakesCount} recovered`
          : 'Try a similar problem after a miss',
    },
    {
      id: 'consistent_learner',
      title: 'Consistent Learner',
      description: 'Practiced or completed work 3 days in a row.',
      earned: streak.bestStreak >= 3,
      progressLabel: `${Math.min(streak.bestStreak, 3)} / 3 day streak`,
    },
    {
      id: 'perfect_score',
      title: 'Full Mark Mastery',
      description: 'Earned 100% on a practice sheet or exam.',
      earned: input.perfectScoreCount >= 1,
      progressLabel:
        input.perfectScoreCount >= 1
          ? `${input.perfectScoreCount} full mark${input.perfectScoreCount === 1 ? '' : 's'}`
          : 'Score 100% on any sheet or exam',
    },
    {
      id: 'independent_solver',
      title: 'Independent Solver',
      description: 'Solved 5 practice questions correctly without using hints.',
      earned: input.independentAnswersCount >= 5,
      progressLabel: `${Math.min(input.independentAnswersCount, 5)} / 5 hint-free`,
    },
    {
      id: 'sheet_finisher',
      title: 'Sheet Finisher',
      description: 'Completed 3 full practice sheets.',
      earned: input.completedPracticeCount >= 3,
      progressLabel: `${Math.min(input.completedPracticeCount, 3)} / 3 sheets`,
    },
  ]
}
