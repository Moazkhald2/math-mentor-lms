import { describe, it, expect, beforeEach } from 'vitest'
import {
  getTimerUrgency,
  formatMinutesOnly,
  persistExamDeadline,
  loadExamDeadline,
  clearExamDeadline,
  computeRemainingSecondsFromDeadline,
  saveQuestionTimings,
  loadQuestionTimings,
  analyzeQuestionSpeeds,
} from '../../lib/examTiming'

describe('Step 17 — Colour-Shifting Timer, Offline Deadline & Speed Insights', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('classifies timer urgency as calm -> amber -> urgent while preserving minutes-only display', () => {
    // 60 min exam
    expect(getTimerUrgency(45 * 60, 60 * 60)).toBe('calm')
    expect(getTimerUrgency(12 * 60, 60 * 60)).toBe('amber') // 20% left
    expect(getTimerUrgency(4 * 60, 60 * 60)).toBe('urgent') // <= 5 min

    expect(formatMinutesOnly(45 * 60)).toBe('45 min')
    expect(formatMinutesOnly(65)).toBe('2 min')
    expect(formatMinutesOnly(42)).toBe('< 1 min')
    expect(formatMinutesOnly(0)).toBe('0 min')
  })

  it('persists server-anchored deadlines for offline resilience and computes remaining seconds accurately', () => {
    const now = new Date('2026-11-21T10:00:00Z').getTime()
    const deadlineIso = new Date(now + 15 * 60 * 1000).toISOString()

    persistExamDeadline({ attemptId: 'att-42', deadlineIso, totalSeconds: 3600 })
    const loaded = loadExamDeadline('att-42')
    expect(loaded?.deadlineIso).toBe(deadlineIso)

    expect(computeRemainingSecondsFromDeadline(deadlineIso, now)).toBe(900)
    expect(computeRemainingSecondsFromDeadline(deadlineIso, now + 20 * 60 * 1000)).toBe(0)

    clearExamDeadline('att-42')
    expect(loadExamDeadline('att-42')).toBeNull()
  })

  it('persists per-question timings and produces kind pacing insights', () => {
    saveQuestionTimings('att-42', { q1: 10, q2: 8, q3: 110, q4: 45 })
    const loaded = loadQuestionTimings('att-42')
    expect(loaded).toEqual({ q1: 10, q2: 8, q3: 110, q4: 45 })

    const summary = analyzeQuestionSpeeds(loaded, [
      { question_id: 'q1', is_correct: false },
      { question_id: 'q2', is_correct: false },
      { question_id: 'q3', is_correct: true },
      { question_id: 'q4', is_correct: true },
    ])

    expect(summary).not.toBeNull()
    expect(summary?.rushedMistakesCount).toBe(2)
    expect(summary?.slowCorrectCount).toBe(1)
    expect(summary?.perQuestion.q1.tone).toBe('gentle')
    expect(summary?.perQuestion.q3.tone).toBe('positive')
    expect(summary?.headline).toMatch(/went by quickly/i)
  })
})
