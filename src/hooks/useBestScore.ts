import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { fetchStudentAttempts, getBestScore } from '../lib/exams'
import type { ExamAttempt } from '../types'

export interface BestScoreInfo {
  attempts: ExamAttempt[]
  best: number
  used: number
  left: number
}

export function useBestScore(examId?: string, maxAttempts?: number) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['my-exam-attempts', user?.id, examId],
    queryFn: async (): Promise<BestScoreInfo> => {
      if (!examId || !user) return { attempts: [], best: 0, used: 0, left: 0 }
      const attempts = await fetchStudentAttempts(examId, user.id)
      const used = attempts.filter((a) => a.status === 'completed').length
      const best = getBestScore(attempts)
      return { attempts, best, used, left: Math.max(0, (maxAttempts ?? 3) - used) }
    },
    enabled: !!examId && !!user,
  })
}