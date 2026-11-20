import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}))

import { supabase } from '../../lib/supabase'
import { pruneOldActivityLogs, fetchLogRetentionDays } from '../../lib/activity'

describe('portable log maintenance (Step 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls prune_old_activity_logs RPC with clamped retention days', async () => {
    const mockRes = {
      retention_days: 90,
      deleted_activity_logs: 12,
      deleted_rate_limits: 4,
      ran_at: '2026-11-20T00:00:00Z',
    }
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockRes, error: null } as any)

    const res = await pruneOldActivityLogs(90)
    expect(supabase.rpc).toHaveBeenCalledWith('prune_old_activity_logs', { p_retention_days: 90 })
    expect(res).toEqual(mockRes)
  })

  it('clamps dangerously low retention days to minimum 7 days', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { retention_days: 7, deleted_activity_logs: 0, deleted_rate_limits: 0, ran_at: '' },
      error: null,
    } as any)

    await pruneOldActivityLogs(1)
    expect(supabase.rpc).toHaveBeenCalledWith('prune_old_activity_logs', { p_retention_days: 7 })
  })

  it('falls back to 90 days when system_settings query has no row', async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain)

    expect(await fetchLogRetentionDays()).toBe(90)
  })
})
