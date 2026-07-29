import { describe, it, expect, vi, beforeEach } from 'vitest'

function createQueryBuilder(returnData: any[] = []) {
  const resolveValue = { data: returnData, error: null }
  const chain: any = {
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: returnData[0], error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: returnData[0], error: null })),
    insert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
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
import { toggleBookmark, fetchBookmarkedIds, fetchBookmarkedQuestions, submitFeedback } from '../../lib/bookmarks'

describe('bookmarks lib', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('toggleBookmark', () => {
    it('creates bookmark when none exists', async () => {
      const qb = createQueryBuilder([])
      qb.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
      vi.mocked(supabase.from).mockReturnValue(qb)

      const result = await toggleBookmark('user-1', 'q-1')
      expect(result).toBe(true)
      expect(qb.insert).toHaveBeenCalledWith({ user_id: 'user-1', question_id: 'q-1' })
    })

    it('removes bookmark when one exists', async () => {
      const qb = createQueryBuilder([{ id: 'bm-1' }])
      vi.mocked(supabase.from).mockReturnValue(qb)

      const result = await toggleBookmark('user-1', 'q-1')
      expect(result).toBe(false)
      expect(qb.delete).toHaveBeenCalled()
      expect(qb.eq).toHaveBeenCalledWith('id', 'bm-1')
    })
  })

  describe('fetchBookmarkedIds', () => {
    it('returns set of question ids', async () => {
      const qb = createQueryBuilder([{ question_id: 'q-1' }, { question_id: 'q-2' }])
      vi.mocked(supabase.from).mockReturnValue(qb)

      const result = await fetchBookmarkedIds('user-1')
      expect(result.has('q-1')).toBe(true)
      expect(result.has('q-2')).toBe(true)
      expect(result.has('q-3')).toBe(false)
    })
  })

  describe('fetchBookmarkedQuestions', () => {
    it('returns bookmarked questions with join', async () => {
      const mockData = [{ created_at: '2024-01-01', question: { id: 'q-1', subject: 'Algebra', topic: 'Equations' } }]
      const qb = createQueryBuilder(mockData)
      vi.mocked(supabase.from).mockReturnValue(qb)

      const result = await fetchBookmarkedQuestions('user-1')
      expect(result).toEqual(mockData)
    })
  })

  describe('submitFeedback', () => {
    it('upserts feedback', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)

      await submitFeedback('user-1', 'q-1', 'bug', 'Wrong answer')
      expect(qb.upsert).toHaveBeenCalledWith({
        user_id: 'user-1',
        question_id: 'q-1',
        feedback_type: 'bug',
        comment: 'Wrong answer',
      })
      expect(qb.select).toHaveBeenCalled()
    })
  })
})
