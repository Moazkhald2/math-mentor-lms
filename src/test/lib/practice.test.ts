import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

import { supabase } from '../../lib/supabase'
import {
  fetchPracticeQuestionsSafe,
  startPractice,
  upsertAnswer,
  finishPractice,
} from '../../lib/practice'

describe('practice lib (safe server RPCs)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchPracticeQuestionsSafe', () => {
    it('calls get_practice_questions_safe RPC', async () => {
      const mockRows = [{ id: 'eq-1', question_id: 'q-1', question: { id: 'q-1' } }]
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockRows, error: null } as any)
      const result = await fetchPracticeQuestionsSafe('sheet-1')
      expect(supabase.rpc).toHaveBeenCalledWith('get_practice_questions_safe', { p_exam_id: 'sheet-1' })
      expect(result).toEqual(mockRows)
    })

    it('throws when RPC rejects live exams', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: new Error('not_a_practice_sheet') } as any)
      await expect(fetchPracticeQuestionsSafe('live-exam-1')).rejects.toThrow('not_a_practice_sheet')
    })
  })

  describe('startPractice', () => {
    it('calls start_practice_attempt RPC and returns the created attempt', async () => {
      const mockAttempt = { id: 'att-1', exam_id: 'exam-1', status: 'in_progress' }
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockAttempt, error: null } as any)
      const result = await startPractice('exam-1', 'user-1')
      expect(supabase.rpc).toHaveBeenCalledWith('start_practice_attempt', { p_exam_id: 'exam-1' })
      expect(result).toEqual(mockAttempt)
    })

    it('throws on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: new Error('DB error') } as any)
      await expect(startPractice('exam-1', 'user-1')).rejects.toThrow('DB error')
    })
  })

  describe('upsertAnswer', () => {
    it('calls upsert_practice_answer RPC with all arguments', async () => {
      const mockAnswer = { id: 'ans-1', attempt_id: 'att-1', answer: 'B' }
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockAnswer, error: null } as any)
      const result = await upsertAnswer('att-1', 'q-1', 'B', true, 1)
      expect(supabase.rpc).toHaveBeenCalledWith('upsert_practice_answer', {
        p_attempt_id: 'att-1',
        p_question_id: 'q-1',
        p_answer: 'B',
        p_is_correct: true,
        p_points_earned: 1,
      })
      expect(result).toEqual(mockAnswer)
    })

    it('defaults isCorrect to false and pointsEarned to 0', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { id: 'ans-1' }, error: null } as any)
      await upsertAnswer('att-1', 'q-1', 'A')
      expect(supabase.rpc).toHaveBeenCalledWith('upsert_practice_answer', {
        p_attempt_id: 'att-1',
        p_question_id: 'q-1',
        p_answer: 'A',
        p_is_correct: false,
        p_points_earned: 0,
      })
    })

    it('throws on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: new Error('Upsert failed') } as any)
      await expect(upsertAnswer('att-1', 'q-1', 'A')).rejects.toThrow('Upsert failed')
    })
  })

  describe('finishPractice', () => {
    it('calls finish_practice_attempt RPC and returns completed attempt', async () => {
      const mockAttempt = { id: 'att-1', score: 7, status: 'completed' }
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockAttempt, error: null } as any)
      const result = await finishPractice('att-1', 7, 10)
      expect(supabase.rpc).toHaveBeenCalledWith('finish_practice_attempt', {
        p_attempt_id: 'att-1',
        p_score: 7,
        p_total_points: 10,
      })
      expect(result).toEqual(mockAttempt)
    })

    it('throws on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: new Error('Update failed') } as any)
      await expect(finishPractice('att-1', 7, 10)).rejects.toThrow('Update failed')
    })
  })
})
