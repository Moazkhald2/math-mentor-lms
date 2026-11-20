import { describe, it, expect, vi, beforeEach } from 'vitest'

function createChain(returnData: any = []) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue({ data: Array.isArray(returnData) ? returnData[0] : returnData, error: null }),
    then: (onFulfilled: any) => Promise.resolve({ data: returnData, error: null }).then(onFulfilled),
  }
  return chain
}

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => createChain([])),
  },
}))

import { supabase } from '../../lib/supabase'
import {
  buildGroupInviteUrl,
  previewGroupInvite,
  redeemGroupInvite,
  updateGroupInviteSettings,
  createExamAssignment,
  deleteExamAssignment,
} from '../../lib/groups'

describe('groups & invite links lib (Step 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds clean uppercase shareable invite URLs', () => {
    expect(buildGroupInviteUrl(' g10-abc123 ', 'https://math-mentor-lms.pages.dev/')).toBe(
      'https://math-mentor-lms.pages.dev/join/G10-ABC123'
    )
  })

  it('calls preview_group_invite with trimmed uppercase code', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { valid: true, group_name: 'Sat/Tue 5PM', grade: 10, spots_left: 15 },
      error: null,
    } as any)

    const res = await previewGroupInvite(' g10-xyz ')
    expect(supabase.rpc).toHaveBeenCalledWith('preview_group_invite', { p_code: 'G10-XYZ' })
    expect(res.valid).toBe(true)
    expect(res.grade).toBe(10)
  })

  it('calls redeem_group_invite RPC and returns membership confirmation', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { joined: true, already_member: false, group_id: 'grp-1', group_name: 'Group A', grade: 8 },
      error: null,
    } as any)

    const res = await redeemGroupInvite('g8-abc')
    expect(supabase.rpc).toHaveBeenCalledWith('redeem_group_invite', { p_code: 'G8-ABC' })
    expect(res.joined).toBe(true)
    expect(res.grade).toBe(8)
  })

  it('calls update_group_invite_settings to toggle, rotate, or cap group invites', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { id: 'grp-1', invite_enabled: true, invite_code: 'G8-NEWCODE' },
      error: null,
    } as any)

    const res = await updateGroupInviteSettings('grp-1', {
      inviteEnabled: true,
      rotateCode: true,
      maxStudents: 40,
    })
    expect(supabase.rpc).toHaveBeenCalledWith('update_group_invite_settings', {
      p_class_id: 'grp-1',
      p_invite_enabled: true,
      p_rotate_code: true,
      p_expires_at: null,
      p_clear_expiry: false,
      p_max_students: 40,
      p_clear_max: false,
      p_schedule_note: null,
    })
    expect(res.invite_code).toBe('G8-NEWCODE')
  })

  it('inserts group-targeted exam assignment with exclusive target columns', async () => {
    const chain = createChain([{ id: 'asg-1', exam_id: 'ex-1', target_type: 'group', target_group_id: 'grp-1' }])
    vi.mocked(supabase.from).mockReturnValueOnce(chain)

    const res = await createExamAssignment({
      examId: 'ex-1',
      targetType: 'group',
      targetGroupId: 'grp-1',
      targetGrade: 10, // must be nulled out for targetType='group'
    })
    expect(chain.insert).toHaveBeenCalledWith({
      exam_id: 'ex-1',
      target_type: 'group',
      target_grade: null,
      target_group_id: 'grp-1',
      target_student_id: null,
      starts_at_override: null,
      ends_at_override: null,
    })
    expect(res.id).toBe('asg-1')
  })

  it('deletes an exam assignment by id', async () => {
    const chain = createChain([])
    vi.mocked(supabase.from).mockReturnValueOnce(chain)
    await deleteExamAssignment('asg-1')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'asg-1')
  })
})
