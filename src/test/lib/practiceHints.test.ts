import { describe, it, expect } from 'vitest'
import {
  buildTieredHints,
  findSimilarFamilyCandidate,
  getEncouragingFeedback,
} from '../../lib/practiceHints'
import type { Question } from '../../types'

const baseQ = (overrides: Partial<Question> = {}): Question => ({
  id: 'q-1',
  type: 'multiple_choice',
  subject: 'math',
  topic: 'Linear Equations',
  difficulty: 2,
  question_text: 'Solve 2x + 3 = 11',
  options: ['3', '4', '5', '7'],
  correct_answer: '1',
  explanation: 'Subtract 3 from both sides to get 2x = 8.\nDivide both sides by 2.\nTherefore x = 4.',
  image_url: '',
  common_mistakes: [
    { mistake: 'Adding 3 instead of subtracting 3', why: 'Always apply the inverse operation', correct: 'Subtract 3 first' },
  ],
  variant_group_id: null,
  created_by: 'teacher-1',
  created_at: '2026-11-20T00:00:00Z',
  ...overrides,
})

describe('Step 15 — Tiered Hints, Encouraging Feedback & Question Families', () => {
  it('uses explicit authored hints when available and falls back to derived steps + common mistakes', () => {
    const explicit = buildTieredHints(baseQ({ hints: ['Move constants first', 'Then divide by the coefficient of x'] }))
    expect(explicit.hint1).toBe('Move constants first')
    expect(explicit.hint2).toBe('Then divide by the coefficient of x')
    expect(explicit.fullSolution).toContain('x = 4')

    const derived = buildTieredHints(baseQ())
    expect(derived.hint1).toContain('Subtract 3 from both sides')
    expect(derived.hint2).toContain('Adding 3 instead of subtracting 3')
    expect(derived.fullSolution).toContain('x = 4')
  })

  it('produces non-shaming encouraging feedback and celebrates mistake recovery', () => {
    const wrong = getEncouragingFeedback({ isCorrect: false, recoveredFromMistake: false, hintsUsed: 0 })
    expect(wrong.title).toMatch(/Not quite yet/i)
    expect(wrong.title).not.toMatch(/wrong/i)

    const recovered = getEncouragingFeedback({ isCorrect: true, recoveredFromMistake: true, hintsUsed: 0 })
    expect(recovered.title).toMatch(/Mistake Recovered/i)

    const independent = getEncouragingFeedback({ isCorrect: true, recoveredFromMistake: false, hintsUsed: 0 })
    expect(independent.title).toMatch(/Spot on/i)
  })

  it('prioritizes Question Family siblings over parameterized templates and topic fallbacks', () => {
    const q1 = baseQ({ id: 'q-1', family_id: 'g7-lin-eq-2step', params: { a: { min: 2, max: 5 } } })
    const q2 = baseQ({ id: 'q-2', family_id: 'g7-lin-eq-2step', question_text: 'Solve 3x + 4 = 19' })
    const q3 = baseQ({ id: 'q-3', family_id: null, topic: 'Linear Equations', question_text: 'Solve x - 5 = 2' })

    // 1. Picks structural family sibling first
    const first = findSimilarFamilyCandidate(q1, [q1, q2, q3], new Set(['q-1']))
    expect(first?.mode).toBe('family')
    expect(first?.question.id).toBe('q-2')

    // 2. Once family sibling is tried, falls back to parameterized template
    const second = findSimilarFamilyCandidate(q1, [q1, q2, q3], new Set(['q-1', 'q-2']))
    expect(second?.mode).toBe('params')

    // 3. Without params or family siblings, falls back to same-topic sibling
    const noParams = baseQ({ id: 'q-1', family_id: null, params: null })
    const third = findSimilarFamilyCandidate(noParams, [noParams, q3], new Set(['q-1']))
    expect(third?.mode).toBe('topic')
    expect(third?.question.id).toBe('q-3')
  })
})
