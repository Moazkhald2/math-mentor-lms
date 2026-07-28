import { supabase } from './supabase'

export type ActivityAction =
  | 'exam_started'
  | 'exam_submitted'
  | 'question_answered'
  | 'practice_answered'
  | 'tab_switch'
  | 'violation'

export async function logActivity(
  userId: string,
  action: ActivityAction,
  details: Record<string, unknown> = {},
  examId?: string
) {
  const { error } = await supabase.from('activity_logs').insert({
    user_id: userId,
    exam_id: examId ?? null,
    action,
    details,
  })
  if (error) console.error('Failed to log activity:', error)
}

export async function fetchActivityLogs(
  userId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function fetchAllActivityLogs(options?: {
  limit?: number
  userId?: string
  examId?: string
  action?: string
}) {
  let query = supabase
    .from('activity_logs')
    .select('*, profiles!inner(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 100)

  if (options?.userId) query = query.eq('user_id', options.userId)
  if (options?.examId) query = query.eq('exam_id', options.examId)
  if (options?.action) query = query.eq('action', options.action)

  const { data, error } = await query
  if (error) throw error
  return data
}