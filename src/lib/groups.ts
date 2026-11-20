import { supabase } from './supabase'

export interface GroupRecord {
  id: string
  name: string
  grade: number
  teacher_id: string | null
  invite_code: string | null
  invite_enabled: boolean
  invite_expires_at: string | null
  max_students: number | null
  schedule_note: string
  created_at: string
  profiles?: { email: string | null; full_name: string | null } | null
}

export interface GroupInvitePreview {
  valid: boolean
  reason?: 'invalid_or_disabled' | 'expired' | 'group_full'
  group_id?: string
  group_name?: string
  grade?: number
  schedule_note?: string
  spots_left?: number | null
}

export interface GroupInviteRedeemResult {
  joined: boolean
  already_member: boolean
  group_id: string
  group_name: string
  grade: number
}

export type AssignmentTargetType = 'grade' | 'group' | 'student'

export interface ExamAssignment {
  id: string
  exam_id: string
  target_type: AssignmentTargetType
  target_grade: number | null
  target_group_id: string | null
  target_student_id: string | null
  starts_at_override: string | null
  ends_at_override: string | null
  created_by: string | null
  created_at: string
}

export function buildGroupInviteUrl(inviteCode: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://math-mentor-lms.pages.dev')
  return `${base.replace(/\/$/, '')}/join/${encodeURIComponent(inviteCode.trim().toUpperCase())}`
}

export async function previewGroupInvite(code: string): Promise<GroupInvitePreview> {
  const { data, error } = await supabase.rpc('preview_group_invite', {
    p_code: code.trim().toUpperCase(),
  })
  if (error) throw error
  return data as GroupInvitePreview
}

export async function redeemGroupInvite(code: string): Promise<GroupInviteRedeemResult> {
  const { data, error } = await supabase.rpc('redeem_group_invite', {
    p_code: code.trim().toUpperCase(),
  })
  if (error) throw error
  return data as GroupInviteRedeemResult
}

export async function updateGroupInviteSettings(
  classId: string,
  opts: {
    inviteEnabled?: boolean
    rotateCode?: boolean
    expiresAt?: string | null
    clearExpiry?: boolean
    maxStudents?: number | null
    clearMax?: boolean
    scheduleNote?: string
  }
): Promise<GroupRecord> {
  const { data, error } = await supabase.rpc('update_group_invite_settings', {
    p_class_id: classId,
    p_invite_enabled: opts.inviteEnabled ?? null,
    p_rotate_code: opts.rotateCode ?? false,
    p_expires_at: opts.expiresAt ?? null,
    p_clear_expiry: opts.clearExpiry ?? false,
    p_max_students: opts.maxStudents ?? null,
    p_clear_max: opts.clearMax ?? false,
    p_schedule_note: opts.scheduleNote ?? null,
  })
  if (error) throw error
  return data as GroupRecord
}

export async function fetchExamAssignments(examId?: string): Promise<ExamAssignment[]> {
  let query = supabase
    .from('exam_assignments')
    .select('*')
    .order('created_at', { ascending: false })
  if (examId) query = query.eq('exam_id', examId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ExamAssignment[]
}

export async function createExamAssignment(input: {
  examId: string
  targetType: AssignmentTargetType
  targetGrade?: number | null
  targetGroupId?: string | null
  targetStudentId?: string | null
  startsAtOverride?: string | null
  endsAtOverride?: string | null
}): Promise<ExamAssignment> {
  const payload = {
    exam_id: input.examId,
    target_type: input.targetType,
    target_grade: input.targetType === 'grade' ? input.targetGrade ?? null : null,
    target_group_id: input.targetType === 'group' ? input.targetGroupId ?? null : null,
    target_student_id: input.targetType === 'student' ? input.targetStudentId ?? null : null,
    starts_at_override: input.startsAtOverride ?? null,
    ends_at_override: input.endsAtOverride ?? null,
  }
  const { data, error } = await supabase
    .from('exam_assignments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as ExamAssignment
}

export async function deleteExamAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('exam_assignments')
    .delete()
    .eq('id', assignmentId)
  if (error) throw error
}
