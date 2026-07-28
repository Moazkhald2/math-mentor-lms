import { useCallback } from 'react'
import { useAuth } from './useAuth'
import { logActivity } from '../lib/activity'
import type { ActivityAction } from '../lib/activity'

export function useActivityLogger(examId?: string) {
  const { user } = useAuth()

  const log = useCallback(
    async (action: ActivityAction, details: Record<string, unknown> = {}) => {
      if (!user) return
      await logActivity(user.id, action, details, examId)
    },
    [user, examId]
  )

  return { log }
}