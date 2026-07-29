import { describe, it, expect, vi, beforeEach } from 'vitest'

function createQueryBuilder(returnData: any[] = []) {
  const chain: any = {
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve({ data: returnData, error: null })),
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: returnData[0], error: null })),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
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
import { fetchQuestions, fetchQuestionFilters, fetchQuestionsByDifficulty, createQuestion, updateQuestion, deleteQuestion } from '../../lib/questions'

describe('questions lib', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchQuestions', () => {
    it('calls supabase with questions table', async () => {
      vi.mocked(supabase.from).mockReturnValue(createQueryBuilder([]))
      await fetchQuestions()
      expect(supabase.from).toHaveBeenCalledWith('questions')
    })

    it('chains eq when subject filter is provided', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await fetchQuestions({ subject: 'Algebra' })
      expect(qb.eq).toHaveBeenCalledWith('subject', 'Algebra')
    })

    it('chains eq when difficulty filter is provided', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await fetchQuestions({ difficulty: 2 as any })
      expect(qb.eq).toHaveBeenCalledWith('difficulty', 2)
    })

    it('returns data on success', async () => {
      const mockData = [{ id: '1', question_text: 'Test' }]
      vi.mocked(supabase.from).mockReturnValue(createQueryBuilder(mockData))
      const result = await fetchQuestions()
      expect(result).toEqual(mockData)
    })

    it('rejects on error', async () => {
      const qb = createQueryBuilder([])
      qb.order = vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(fetchQuestions()).rejects.toThrow('DB error')
    })
  })

  describe('fetchQuestionsByDifficulty', () => {
    it('calls fetchQuestions with difficulty filter', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await fetchQuestionsByDifficulty(3 as any)
      expect(qb.eq).toHaveBeenCalledWith('difficulty', 3)
    })
  })

  describe('fetchQuestionFilters', () => {
    it('returns deduplicated subjects and topics', async () => {
      const subData = [{ subject: 'Algebra' }, { subject: 'Algebra' }, { subject: 'Geometry' }]
      const topData = [{ topic: 'Equations' }, { topic: 'Functions' }]

      let callCount = 0
      const mockSelect = vi.fn(() => {
        callCount++
        if (callCount === 1) return Promise.resolve({ data: subData, error: null })
        return Promise.resolve({ data: topData, error: null })
      })

      const qb = createQueryBuilder([])
      qb.select = vi.fn(() => ({ ...qb, data: callCount === 1 ? subData : topData }))
      qb.select = mockSelect
      vi.mocked(supabase.from).mockReturnValue(qb)

      const result = await fetchQuestionFilters()
      expect(result.subjects).toEqual(['Algebra', 'Geometry'])
      expect(result.topics).toEqual(['Equations', 'Functions'])
    })
  })

  describe('createQuestion', () => {
    it('inserts into questions table', async () => {
      const mockData = { id: 'new-id', question_text: 'New Q' }
      const qb = createQueryBuilder([mockData])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const input = { question_text: 'New Q', type: 'multiple_choice' as const, subject: 'Math', topic: 'Algebra', difficulty: 2 as any, options: [], correct_answer: 'A', explanation: '', image_url: '', common_mistakes: [] }
      const result = await createQuestion(input as any)
      expect(result).toEqual(mockData)
      expect(qb.insert).toHaveBeenCalledWith(input)
    })
  })

  describe('deleteQuestion', () => {
    it('calls delete with eq id', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await deleteQuestion('q-id')
      expect(qb.eq).toHaveBeenCalledWith('id', 'q-id')
    })
  })
})
