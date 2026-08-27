import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

const LAST_ACTIVITY_KEY = 'math_mentor_last_activity'

function mockUser(id = 'user-1', email = 'test@test.com') {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  }
}

function mockSession(user = mockUser()) {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer' as const,
    user,
  }
}

function mockAuthError(message: string) {
  const err = new Error(message) as any
  err.name = 'AuthError'
  err.status = 400
  err.code = 'error'
  err.__isAuthError = true
  err.toJSON = () => ({ name: 'AuthError', message, status: 400, code: 'error' })
  return err
}

vi.mock('../../lib/supabase', () => {
  const createQuery = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  })

  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(),
        signInWithPassword: vi.fn(),
        signInWithOAuth: vi.fn(),
        signUp: vi.fn(),
        resend: vi.fn().mockResolvedValue({ error: null } as any),
        signOut: vi.fn(),
      },
      from: vi.fn(() => createQuery()),
    },
  }
})

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          id: 'sub-1',
          callback: vi.fn(),
          unsubscribe: vi.fn(),
        },
      },
    })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null, weakPassword: null },
      error: null,
    } as any)
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: 'https://example.com' },
      error: null,
    })
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('AuthProvider', () => {
    it('provides initial state with user null and loading true', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(true)
    })

    it('restores session on mount when getSession returns a user', async () => {
      const user = mockUser()
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession(user) },
        error: null,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

      await waitFor(() => {
        expect(result.current.user).toEqual(user)
      })
      expect(result.current.loading).toBe(false)
    })
  })

  describe('signIn', () => {
    it('returns null on successful sign in', async () => {
      const user = mockUser('1', 'a@b.com')
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user, session: mockSession(user), weakPassword: undefined },
        error: null,
      } as any)

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const err = await result.current.signIn('a@b.com', 'correct-password')

      expect(err).toBeNull()
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'correct-password',
      })
    })

    it('returns error message on wrong password', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null, weakPassword: null },
        error: mockAuthError('Invalid login credentials'),
      } as any)

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const err = await result.current.signIn('a@b.com', 'wrong-password')

      expect(err).toBe('Invalid login credentials')
    })

    it('returns cooldown message after max attempts', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null, weakPassword: null },
        error: null,
      } as any)

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
      await waitFor(() => expect(result.current.loading).toBe(false))

      for (let i = 0; i < 6; i++) {
        const err = await result.current.signIn('a@b.com', 'pass')
        if (i < 5) {
          expect(err).toBeNull()
        } else {
          expect(err).toBe('Too many attempts. Try again in 60 seconds.')
        }
      }
    })
  })

  describe('signOut', () => {
    it('calls supabase.auth.signOut and clears last activity key', async () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await result.current.signOut()

      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBeNull()
    })
  })

  describe('signUp', () => {
    it('calls supabase.auth.signUp with correct params', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const res = await result.current.signUp(
        'new@test.com',
        'password123',
        'Test User',
        10,
        '1234567890',
      )

      expect(res.error).toBeNull()
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User',
            grade: 10,
            parent_phone: '1234567890',
          },
        },
      })
    })

    it('uses empty string for parentPhone when not provided', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await result.current.signUp('new@test.com', 'password', 'No Phone User')

      expect(supabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({
              parent_phone: '',
            }),
          }),
        }),
      )
    })

    it('returns error message on sign up failure', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: mockAuthError('User already registered'),
      } as any)

      const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const res = await result.current.signUp('old@test.com', 'pass', 'Old User')

      expect(res.error).toBe('User already registered')
    })
  })

  describe('idle timeout', () => {
    it('signs out when idle for more than 1 hour', async () => {
      vi.useFakeTimers()
      localStorage.setItem(LAST_ACTIVITY_KEY, '0')

      renderHook(() => useAuth(), { wrapper: AuthProvider })

      await vi.advanceTimersByTimeAsync(0)

      await vi.advanceTimersByTimeAsync(3_600_000 + 30_000)

      expect(supabase.auth.signOut).toHaveBeenCalled()
    })

    it('does NOT sign out when activity is recent', async () => {
      vi.useFakeTimers()
      localStorage.setItem(LAST_ACTIVITY_KEY, '0')

      renderHook(() => useAuth(), { wrapper: AuthProvider })

      await vi.advanceTimersByTimeAsync(0)

      await vi.advanceTimersByTimeAsync(30_000)

      expect(supabase.auth.signOut).not.toHaveBeenCalled()
    })
  })
})
