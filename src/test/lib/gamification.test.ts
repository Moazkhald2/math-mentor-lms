import { describe, it, expect, beforeEach } from 'vitest'
import {
  isGamificationEnabled,
  setGamificationEnabled,
  computeDailyStreak,
  computeEffortBadges,
} from '../../lib/gamification'
import { getGradeTheme, applyGradeThemeToDocument } from '../../lib/gradeTheme'

describe('Step 16 — Opt-In Gamification & Grade-Adaptive Theme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.gradeTier
  })

  it('defaults gamification to OFF (strictly opt-in) and isolates per user', () => {
    expect(isGamificationEnabled('stu-1')).toBe(false)
    setGamificationEnabled('stu-1', true)
    expect(isGamificationEnabled('stu-1')).toBe(true)
    expect(isGamificationEnabled('stu-2')).toBe(false)
    setGamificationEnabled('stu-1', false)
    expect(isGamificationEnabled('stu-1')).toBe(false)
  })

  it('computes daily practice streaks accurately without punishing today before practice', () => {
    const now = new Date('2026-11-21T12:00:00')
    const active = computeDailyStreak(
      ['2026-11-18T10:00:00', '2026-11-19T14:00:00', '2026-11-20T18:00:00'],
      now
    )
    expect(active.currentStreak).toBe(3)
    expect(active.bestStreak).toBe(3)
    expect(active.activeDaysCount).toBe(3)

    const broken = computeDailyStreak(
      ['2026-11-10T10:00:00', '2026-11-11T10:00:00'],
      now
    )
    expect(broken.currentStreak).toBe(0)
    expect(broken.bestStreak).toBe(2)
  })

  it('awards effort and improvement badges based on recovery, consistency, and independence', () => {
    const now = new Date('2026-11-21T12:00:00')
    const badges = computeEffortBadges(
      {
        completedAttemptDates: [
          '2026-11-19T09:00:00',
          '2026-11-20T09:00:00',
          '2026-11-21T09:00:00',
        ],
        completedPracticeCount: 3,
        perfectScoreCount: 1,
        recoveredMistakesCount: 2,
        independentAnswersCount: 6,
      },
      now
    )

    expect(badges.every((b) => b.earned)).toBe(true)
    expect(badges.find((b) => b.id === 'fixed_mistake')?.progressLabel).toBe('2 recovered')
    expect(badges.find((b) => b.id === 'consistent_learner')?.earned).toBe(true)
  })

  it('maps Grades 1-12 to House v2 grade accents and applies data-grade-tier to document', () => {
    const g4 = applyGradeThemeToDocument(4)
    expect(g4.tier).toBe('primary')
    expect(g4.accentHex).toBe('#E76F51')
    expect(document.documentElement.dataset.gradeTier).toBe('primary')

    const g7 = getGradeTheme(7)
    expect(g7.tier).toBe('middle')
    expect(g7.accentHex).toBe('#2980B9')

    const g10 = applyGradeThemeToDocument(10)
    expect(g10.tier).toBe('high')
    expect(g10.accentHex).toBe('#0A9396')
    expect(document.documentElement.dataset.gradeTier).toBe('high')
  })
})
