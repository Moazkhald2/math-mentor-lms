import { describe, it, expect, vi, beforeEach } from 'vitest'

function createQueryBuilder(returnData: any[] = []) {
  const resolveValue = { data: returnData, error: null }
  const chain: any = {
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: returnData[0], error: null })),
    insert: vi.fn(() => chain),
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

  describe('startAttempt', () => {
    it('calls insert with exam_id, user_id, started_at, and status in_progress', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await startAttempt('exam-1', 'user-1')
      expect(supabase.from).toHaveBeenCalledWith('exam_attempts')
      expect(qb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          exam_id: 'exam-1',
          user_id: 'user-1',
          status: 'in_progress',
          started_at: expect.any(String),
        })
      )
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('returns the created attempt', async () => {
      const mockData = { id: '1', exam_id: 'exam-1', status: 'in_progress' }
      const qb = createQueryBuilder([mockData])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await startAttempt('exam-1', 'user-1')
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('Insert failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(startAttempt('exam-1', 'user-1')).rejects.toThrow('Insert failed')
    })
  })

  describe('submitAnswer', () => {
    it('calls insert with attempt_id, question_id, answer, is_correct, points_earned', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await submitAnswer('attempt-1', 'q-1', 'A', true, 10)
      expect(supabase.from).toHaveBeenCalledWith('answers')
      expect(qb.insert).toHaveBeenCalledWith({
        attempt_id: 'attempt-1',
        question_id: 'q-1',
        answer: 'A',
        is_correct: true,
        points_earned: 10,
      })
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('defaults isCorrect to false and pointsEarned to 0', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await submitAnswer('attempt-1', 'q-1', 'B')
      expect(qb.insert).toHaveBeenCalledWith({
        attempt_id: 'attempt-1',
        question_id: 'q-1',
        answer: 'B',
        is_correct: false,
        points_earned: 0,
      })
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
