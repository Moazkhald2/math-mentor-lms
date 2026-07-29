import { describe, it, expect, vi, beforeEach } from 'vitest'

function createQueryBuilder(returnData: any[] = []) {
  const resolveValue = { data: returnData, error: null }
  const chain: any = {
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: returnData[0], error: null })),
    insert: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    order: vi.fn(() => chain),
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
import { startPractice, upsertAnswer, finishPractice } from '../../lib/practice'

describe('practice lib', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('startPractice', () => {
    it('inserts exam_attempt with exam_id, user_id, started_at, status in_progress', async () => {
      const qb = createQueryBuilder([{ id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', status: 'in_progress' }])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await startPractice('exam-1', 'user-1')
      expect(supabase.from).toHaveBeenCalledWith('exam_attempts')
      expect(qb.insert).toHaveBeenCalledWith(expect.objectContaining({
        exam_id: 'exam-1',
        user_id: 'user-1',
        status: 'in_progress',
        started_at: expect.any(String),
      }))
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('returns the created attempt', async () => {
      const mockAttempt = { id: 'att-1', exam_id: 'exam-1', status: 'in_progress' }
      const qb = createQueryBuilder([mockAttempt])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await startPractice('exam-1', 'user-1')
      expect(result).toEqual(mockAttempt)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(startPractice('exam-1', 'user-1')).rejects.toThrow('DB error')
    })
  })

  describe('upsertAnswer', () => {
    it('upserts into answers table with attempt_id, question_id, answer, is_correct, points_earned', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await upsertAnswer('att-1', 'q-1', 'B', true, 1)
      expect(supabase.from).toHaveBeenCalledWith('answers')
      expect(qb.upsert).toHaveBeenCalledWith({
        attempt_id: 'att-1',
        question_id: 'q-1',
        answer: 'B',
        is_correct: true,
        points_earned: 1,
      })
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('defaults isCorrect to false and pointsEarned to 0', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await upsertAnswer('att-1', 'q-1', 'A')
      expect(qb.upsert).toHaveBeenCalledWith({
        attempt_id: 'att-1',
        question_id: 'q-1',
        answer: 'A',
        is_correct: false,
        points_earned: 0,
      })
    })

    it('returns the upserted answer', async () => {
      const mockAnswer = { id: 'ans-1', attempt_id: 'att-1', answer: 'A' }
      const qb = createQueryBuilder([mockAnswer])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await upsertAnswer('att-1', 'q-1', 'A')
      expect(result).toEqual(mockAnswer)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('Upsert failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(upsertAnswer('att-1', 'q-1', 'A')).rejects.toThrow('Upsert failed')
    })
  })

  describe('finishPractice', () => {
    it('updates exam_attempts with completed_at, score, total_points, status completed', async () => {
      const qb = createQueryBuilder([{ id: 'att-1', score: 7, status: 'completed' }])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await finishPractice('att-1', 7, 10)
      expect(supabase.from).toHaveBeenCalledWith('exam_attempts')
      expect(qb.update).toHaveBeenCalledWith(expect.objectContaining({
        completed_at: expect.any(String),
        score: 7,
        total_points: 10,
        status: 'completed',
      }))
      expect(qb.eq).toHaveBeenCalledWith('id', 'att-1')
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('returns the updated attempt', async () => {
      const mockAttempt = { id: 'att-1', score: 7, status: 'completed' }
      const qb = createQueryBuilder([mockAttempt])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await finishPractice('att-1', 7, 10)
      expect(result).toEqual(mockAttempt)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('Update failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(finishPractice('att-1', 7, 10)).rejects.toThrow('Update failed')
    })
  })
})
