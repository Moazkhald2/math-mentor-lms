import { describe, it, expect, vi, beforeEach } from 'vitest'

function createQueryBuilder(returnData: any[] = []) {
  const resolveValue = { data: returnData, error: null }
  const chain: any = {
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: returnData[0], error: null })),
    insert: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    then: (onFulfilled: any) => Promise.resolve(resolveValue).then(onFulfilled),
  }
  return chain
}

vi.mock('../../lib/supabase', () => {
  const mockQuery = createQueryBuilder([])
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  }
})

import { supabase } from '../../lib/supabase'
import {
  fetchExams,
  createExam,
  fetchExamQuestions,
  addQuestionToExam,
  startAttempt,
  submitAnswer,
  completeAttempt,
  saveAnswer,
  fetchStudentAttempts,
  getBestScore,
} from '../../lib/exams'

describe('exams lib', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchExams', () => {
    it('calls supabase.from("exams").select("*").order("created_at", {ascending: false})', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await fetchExams()
      expect(supabase.from).toHaveBeenCalledWith('exams')
      expect(qb.select).toHaveBeenCalledWith('*')
      expect(qb.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('returns data on success', async () => {
      const mockData = [{ id: '1', title: 'Exam 1' }]
      const qb = createQueryBuilder(mockData)
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await fetchExams()
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.order = vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(fetchExams()).rejects.toThrow('DB error')
    })
  })

  describe('createExam', () => {
    it('calls insert with input, then select().single()', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const input = { title: 'New Exam', subject: 'Math' } as any
      await createExam(input)
      expect(supabase.from).toHaveBeenCalledWith('exams')
      expect(qb.insert).toHaveBeenCalledWith(input)
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('returns the created exam', async () => {
      const mockData = { id: '1', title: 'New Exam' }
      const qb = createQueryBuilder([mockData])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await createExam({ title: 'New Exam' } as any)
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('Insert failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(createExam({} as any)).rejects.toThrow('Insert failed')
    })
  })

  describe('fetchExamQuestions', () => {
    it('calls from("exam_questions") with join and filter', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await fetchExamQuestions('exam-1')
      expect(supabase.from).toHaveBeenCalledWith('exam_questions')
      expect(qb.select).toHaveBeenCalledWith('*, question:questions(*)')
      expect(qb.eq).toHaveBeenCalledWith('exam_id', 'exam-1')
      expect(qb.order).toHaveBeenCalledWith('order_index')
    })

    it('returns data on success', async () => {
      const mockData = [{ id: '1', exam_id: 'exam-1', question: { id: 'q1' } }]
      const qb = createQueryBuilder(mockData)
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await fetchExamQuestions('exam-1')
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.order = vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(fetchExamQuestions('exam-1')).rejects.toThrow('DB error')
    })
  })

  describe('addQuestionToExam', () => {
    it('calls insert with exam_id, question_id, order_index, and default points', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await addQuestionToExam('exam-1', 'q-1', 1)
      expect(supabase.from).toHaveBeenCalledWith('exam_questions')
      expect(qb.insert).toHaveBeenCalledWith({
        exam_id: 'exam-1',
        question_id: 'q-1',
        order_index: 1,
        points: 1,
      })
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('accepts a custom points value', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await addQuestionToExam('exam-1', 'q-1', 2, 5)
      expect(qb.insert).toHaveBeenCalledWith({
        exam_id: 'exam-1',
        question_id: 'q-1',
        order_index: 2,
        points: 5,
      })
    })

    it('returns the created exam question', async () => {
      const mockData = { id: '1', exam_id: 'exam-1', points: 1 }
      const qb = createQueryBuilder([mockData])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await addQuestionToExam('exam-1', 'q-1', 1)
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('Insert failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(addQuestionToExam('exam-1', 'q-1', 1)).rejects.toThrow('Insert failed')
    })
  })

  describe('startAttempt via RPC', () => {
    it('calls supabase.rpc start_exam_attempt with p_exam_id and p_user_id', async () => {
      const attempt = { id: 'a1', seed: 'abc', attempt_number: 1, status: 'in_progress' }
      const spy = vi.fn().mockResolvedValue({ data: attempt, error: null })
      vi.mocked(supabase as any).rpc = spy
      const result = await startAttempt('exam-1', 'user-1')
      expect(spy).toHaveBeenCalledWith('start_exam_attempt', { p_exam_id: 'exam-1', p_user_id: 'user-1' })
      expect(result).toEqual(attempt)
    })

    it('throws when rpc returns an error', async () => {
      vi.mocked(supabase as any).rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('exam_no_attempts_left') })
      await expect(startAttempt('exam-1', 'user-1')).rejects.toThrow('exam_no_attempts_left')
    })
  })

  describe('fetchStudentAttempts', () => {
    it('queries exam_attempts filtered by exam and user, ordered recent first', async () => {
      const qb = createQueryBuilder([{ id: 'a2' }, { id: 'a1' }])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await fetchStudentAttempts('exam-1', 'user-1')
      expect(supabase.from).toHaveBeenCalledWith('exam_attempts')
      expect(qb.eq).toHaveBeenCalledWith('exam_id', 'exam-1')
      expect(qb.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(qb.order).toHaveBeenCalledWith('started_at', { ascending: false })
    })
  })

  describe('getBestScore', () => {
    it('returns the max score among completed attempts', () => {
      const attempts = [
        { id: 'a1', status: 'completed', score: 70 } as any,
        { id: 'a2', status: 'completed', score: 85 } as any,
        { id: 'a3', status: 'in_progress' } as any,
      ]
      expect(getBestScore(attempts)).toBe(85)
    })

    it('returns 0 when no completed attempts', () => {
      expect(getBestScore([{ id: 'a1', status: 'in_progress' } as any])).toBe(0)
    })
  })

  describe('submitAnswer', () => {
    it('calls upsert with attempt_id, question_id, answer, is_correct, points_earned', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await submitAnswer('attempt-1', 'q-1', 'A', true, 10)
      expect(supabase.from).toHaveBeenCalledWith('answers')
      expect(qb.upsert).toHaveBeenCalledWith({
        attempt_id: 'attempt-1',
        question_id: 'q-1',
        answer: 'A',
        is_correct: true,
        points_earned: 10,
      }, { onConflict: 'attempt_id,question_id' })
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('defaults isCorrect to false and pointsEarned to 0', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await submitAnswer('attempt-1', 'q-1', 'B')
      expect(qb.upsert).toHaveBeenCalledWith({
        attempt_id: 'attempt-1',
        question_id: 'q-1',
        answer: 'B',
        is_correct: false,
        points_earned: 0,
      }, { onConflict: 'attempt_id,question_id' })
    })

    it('returns the created answer', async () => {
      const mockData = { id: '1', attempt_id: 'attempt-1', answer: 'A' }
      const qb = createQueryBuilder([mockData])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await submitAnswer('attempt-1', 'q-1', 'A')
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('Insert failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(submitAnswer('attempt-1', 'q-1', 'A')).rejects.toThrow('Insert failed')
    })
  })

  describe('saveAnswer', () => {
    it('calls upsert with attempt_id, question_id, answer, is_correct, points_earned, and onConflict', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await saveAnswer('attempt-1', 'q-1', 'B')
      expect(supabase.from).toHaveBeenCalledWith('answers')
      expect(qb.upsert).toHaveBeenCalledWith(
        {
          attempt_id: 'attempt-1',
          question_id: 'q-1',
          answer: 'B',
          is_correct: false,
          points_earned: 0,
        },
        { onConflict: 'attempt_id,question_id' }
      )
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('returns the saved answer', async () => {
      const mockData = { id: '1', attempt_id: 'attempt-1', answer: 'B' }
      const qb = createQueryBuilder([mockData])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await saveAnswer('attempt-1', 'q-1', 'B')
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('Upsert failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(saveAnswer('attempt-1', 'q-1', 'B')).rejects.toThrow('Upsert failed')
    })
  })

  describe('completeAttempt', () => {
    it('calls update with completed_at, score, total_points, status, and eq id', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await completeAttempt('attempt-1', 85, 100)
      expect(supabase.from).toHaveBeenCalledWith('exam_attempts')
      expect(qb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 85,
          total_points: 100,
          status: 'completed',
          completed_at: expect.any(String),
        })
      )
      expect(qb.eq).toHaveBeenCalledWith('id', 'attempt-1')
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('returns the updated attempt', async () => {
      const mockData = { id: 'attempt-1', score: 85, status: 'completed' }
      const qb = createQueryBuilder([mockData])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await completeAttempt('attempt-1', 85, 100)
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('Update failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(completeAttempt('attempt-1', 85, 100)).rejects.toThrow('Update failed')
    })
  })
})
