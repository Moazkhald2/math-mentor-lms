import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

import { supabase } from '../../lib/supabase'
import { fetchWeakPoints, fetchSubjectSummary } from '../../lib/weakpoints'

describe('weakpoints lib (safe server RPC)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchWeakPoints', () => {
    it('returns empty array when RPC returns empty', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null } as any)
      const result = await fetchWeakPoints('user-1')
      expect(supabase.rpc).toHaveBeenCalledWith('get_student_weak_points')
      expect(result).toEqual([])
    })

    it('maps numeric columns and sorts by accuracy ascending', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [
          { subject: 'Algebra', topic: 'Equations', total: '2', correct: '2', accuracy: '100' },
          { subject: 'Calculus', topic: 'Limits', total: '2', correct: '0', accuracy: '0' },
        ],
        error: null,
      } as any)

      const result = await fetchWeakPoints('user-1')
      expect(result).toEqual([
        { subject: 'Calculus', topic: 'Limits', total: 2, correct: 0, accuracy: 0 },
        { subject: 'Algebra', topic: 'Equations', total: 2, correct: 2, accuracy: 100 },
      ])
    })

    it('throws when RPC fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: new Error('unauthorized') } as any)
      await expect(fetchWeakPoints('user-1')).rejects.toThrow('unauthorized')
    })
  })

  describe('fetchSubjectSummary', () => {
    it('groups weak points by subject', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [
          { subject: 'Algebra', topic: 'Equations', total: 1, correct: 1, accuracy: 100 },
          { subject: 'Algebra', topic: 'Expressions', total: 1, correct: 0, accuracy: 0 },
          { subject: 'Calculus', topic: 'Limits', total: 1, correct: 1, accuracy: 100 },
        ],
        error: null,
      } as any)

      const result = await fetchSubjectSummary('user-1')
      expect(result).toHaveLength(2)
      const alg = result.find(r => r.subject === 'Algebra')
      expect(alg).toEqual({ subject: 'Algebra', total: 2, correct: 1, accuracy: 50 })
      const calc = result.find(r => r.subject === 'Calculus')
      expect(calc).toEqual({ subject: 'Calculus', total: 1, correct: 1, accuracy: 100 })
    })
  })
})
