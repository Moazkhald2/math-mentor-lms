import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

import { supabase } from '../../lib/supabase'
import {
  getOrCreateClientSessionToken,
  claimActiveSession,
  verifyActiveSession,
  signOutOtherDevicesAndClaim,
} from '../../lib/session'

describe('session lib (Step 4 single active session & device-switch recovery)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('generates and persists a stable 16+ char session token per browser', () => {
    const t1 = getOrCreateClientSessionToken()
    const t2 = getOrCreateClientSessionToken()
    expect(t1.length).toBeGreaterThanOrEqual(16)
    expect(t2).toBe(t1)
  })

  it('claimActiveSession calls claim_active_session RPC with token, device label, and force flag', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { status: 'conflict', other_device: 'Mobile · Chrome' },
      error: null,
    } as any)

    const res = await claimActiveSession(false)
    expect(supabase.rpc).toHaveBeenCalledWith('claim_active_session', {
      p_session_token: expect.any(String),
      p_device_label: expect.any(String),
      p_force: false,
    })
    expect(res).toEqual({ status: 'conflict', other_device: 'Mobile · Chrome' })
  })

  it('verifyActiveSession calls verify_active_session RPC', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { valid: true }, error: null } as any)
    const res = await verifyActiveSession()
    expect(supabase.rpc).toHaveBeenCalledWith('verify_active_session', {
      p_session_token: expect.any(String),
    })
    expect(res.valid).toBe(true)
  })

  it('signOutOtherDevicesAndClaim claims with p_force=true and signs out other devices', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: { status: 'switched', token: 'tok-123' },
      error: null,
    } as any)

    const res = await signOutOtherDevicesAndClaim()
    expect(supabase.rpc).toHaveBeenCalledWith('claim_active_session', {
      p_session_token: expect.any(String),
      p_device_label: expect.any(String),
      p_force: true,
    })
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'others' })
    expect(res.status).toBe('switched')
  })
})
