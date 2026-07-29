import { describe, it, expect, vi, beforeEach } from 'vitest'

function createQueryBuilder(returnData: any[] = []) {
  const resolveValue = { data: returnData, error: null }
  const chain: any = {
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: returnData[0], error: null })),
    then: (onFulfilled: any) => Promise.resolve(resolveValue).then(onFulfilled),
  }
  return chain
}

vi.mock('../../lib/supabase', () => {
  const mockQuery = createQueryBuilder([])
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
    },
  }
})

import { supabase } from '../../lib/supabase'
import { fetchWeakPoints, fetchSubjectSummary } from '../../lib/weakpoints'

describe('weakpoints lib', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchWeakPoints', () => {
    it('returns empty array when no attempts found', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await fetchWeakPoints('user-1')
      expect(result).toEqual([])
    })

    it('aggregates answers by subject and topic', async () => {
      const attemptQb = createQueryBuilder([{ id: 'att-1' }])
      const answerQb = createQueryBuilder([
        { question_id: 'q-1', is_correct: true },
        { question_id: 'q-2', is_correct: false },
      ])
      const questionQb = createQueryBuilder([
        { id: 'q-1', subject: 'Algebra', topic: 'Equations' },
        { id: 'q-2', subject: 'Algebra', topic: 'Equations' },
      ])
      vi.mocked(supabase.from)
        .mockReturnValueOnce(attemptQb)
        .mockReturnValueOnce(answerQb)
        .mockReturnValueOnce(questionQb)

      const result = await fetchWeakPoints('user-1')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ subject: 'Algebra', topic: 'Equations', total: 2, correct: 1, accuracy: 50 })
    })

    it('calculates accuracy correctly', async () => {
      const attemptQb = createQueryBuilder([{ id: 'att-1' }])
      const answerQb = createQueryBuilder([
        { question_id: 'q-1', is_correct: true },
        { question_id: 'q-2', is_correct: true },
        { question_id: 'q-3', is_correct: false },
      ])
      const questionQb = createQueryBuilder([
        { id: 'q-1', subject: 'Algebra', topic: 'Equations' },
        { id: 'q-2', subject: 'Algebra', topic: 'Equations' },
        { id: 'q-3', subject: 'Calculus', topic: 'Limits' },
      ])
      vi.mocked(supabase.from)
        .mockReturnValueOnce(attemptQb)
        .mockReturnValueOnce(answerQb)
        .mockReturnValueOnce(questionQb)

      const result = await fetchWeakPoints('user-1')
      expect(result).toHaveLength(2)
      const alg = result.find(r => r.subject === 'Algebra')
      expect(alg?.accuracy).toBe(100)
      const calc = result.find(r => r.subject === 'Calculus')
      expect(calc?.accuracy).toBe(0)
    })

    it('sorts by accuracy ascending', async () => {
      const attemptQb = createQueryBuilder([{ id: 'att-1' }])
      const answerQb = createQueryBuilder([
        { question_id: 'q-1', is_correct: false },
        { question_id: 'q-2', is_correct: true },
      ])
      const questionQb = createQueryBuilder([
        { id: 'q-1', subject: 'Calculus', topic: 'Limits' },
        { id: 'q-2', subject: 'Algebra', topic: 'Equations' },
      ])
      vi.mocked(supabase.from)
        .mockReturnValueOnce(attemptQb)
        .mockReturnValueOnce(answerQb)
        .mockReturnValueOnce(questionQb)

      const result = await fetchWeakPoints('user-1')
      expect(result[0].accuracy).toBeLessThanOrEqual(result[1].accuracy)
    })
  })

  describe('fetchSubjectSummary', () => {
    it('groups weak points by subject', async () => {
      const attemptQb = createQueryBuilder([{ id: 'att-1' }])
      const answerQb = createQueryBuilder([
        { question_id: 'q-1', is_correct: true },
        { question_id: 'q-2', is_correct: false },
        { question_id: 'q-3', is_correct: true },
      ])
      const questionQb = createQueryBuilder([
        { id: 'q-1', subject: 'Algebra', topic: 'Equations' },
        { id: 'q-2', subject: 'Algebra', topic: 'Expressions' },
        { id: 'q-3', subject: 'Calculus', topic: 'Limits' },
      ])
      vi.mocked(supabase.from)
        .mockReturnValueOnce(attemptQb)
        .mockReturnValueOnce(answerQb)
        .mockReturnValueOnce(questionQb)

      const result = await fetchSubjectSummary('user-1')
      expect(result).toHaveLength(2)
      const alg = result.find(r => r.subject === 'Algebra')
      expect(alg).toEqual({ subject: 'Algebra', total: 2, correct: 1, accuracy: 50 })
      const calc = result.find(r => r.subject === 'Calculus')
      expect(calc).toEqual({ subject: 'Calculus', total: 1, correct: 1, accuracy: 100 })
    })
  })
})
