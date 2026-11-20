import { supabase } from './supabase'

// Strictly limited to meaningful security & learning milestone events
// (never log routine UI clicks so Supabase Free 500 MB storage stays lean).
export type ActivityAction =
  | 'exam_started'
  | 'exam_submitted'
  | 'exam_saved'
  | 'practice_started'
  | 'practice_resumed'
  | 'practice_saved_exit'
  | 'practice_submitted'
  | 'question_answered'
  | 'practice_answered'
  | 'practice_mistake_recovered'
  | 'tab_switch'
  | 'violation'
  | 'device_switch'

export interface PruneMaintenanceResult {
  retention_days: number
  deleted_activity_logs: number
  deleted_rate_limits: number
  ran_at: string
}

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

export async function fetchLogRetentionDays(): Promise<number> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'activity_log_retention_days')
    .maybeSingle()
  if (error || !data) return 90
  const parsed = Number(data.value)
  return Number.isFinite(parsed) && parsed >= 7 ? parsed : 90
}

/**
 * Calls portable server maintenance RPC `prune_old_activity_logs`.
 * Guaranteed Free-tier cleanup path — does not rely on pg_cron.
 */
export async function pruneOldActivityLogs(
  retentionDays?: number
): Promise<PruneMaintenanceResult> {
  const clamped =
    retentionDays === undefined
      ? null
      : Math.min(3650, Math.max(7, Math.floor(retentionDays)))
  const { data, error } = await supabase.rpc('prune_old_activity_logs', {
    p_retention_days: clamped,
  })
  if (error) throw error
  return data as PruneMaintenanceResult
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
