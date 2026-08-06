import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBestScore } from '../../hooks/useBestScore'

const state = vi.hoisted(() => ({ attempts: [] as any[] }))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com' } }),
}))

vi.mock('../../lib/supabase', () => {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: (onFulfilled: any) =>
      Promise.resolve({ data: state.attempts, error: null }).then(onFulfilled),
  }
  return {
    supabase: {
      from: vi.fn(() => chain),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  }
})

function Harness({ examId, maxAttempts }: { examId?: string; maxAttempts?: number }) {
  const query = useBestScore(examId, maxAttempts)
  return (
    <div>
      <span data-testid="best">{query.data?.best ?? 'none'}</span>
      <span data-testid="used">{query.data?.used ?? 'none'}</span>
      <span data-testid="left">{query.data?.left ?? 'none'}</span>
      <span data-testid="count">{query.data?.attempts.length ?? 'none'}</span>
    </div>
  )
}

function renderHarness(examId?: string, maxAttempts?: number) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness examId={examId} maxAttempts={maxAttempts} />
    </QueryClientProvider>
  )
}

function completedAttempt(id: string, score: number) {
  return {
    id,
    exam_id: 'e1',
    user_id: 'user-1',
    started_at: '2026-01-01T00:00:00Z',
    completed_at: '2026-01-01T00:30:00Z',
    status: 'completed',
    score,
    total_points: 100,
  }
}

describe('useBestScore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.attempts = []
  })

  it('returns the best completed score plus used and left counts', async () => {
    state.attempts = [completedAttempt('a1', 55), completedAttempt('a2', 85)]

    renderHarness('e1', 3)

    await waitFor(() => expect(screen.getByTestId('best')).toHaveTextContent('85'))
    expect(screen.getByTestId('used')).toHaveTextContent('2')
    expect(screen.getByTestId('left')).toHaveTextContent('1')
    expect(screen.getByTestId('count')).toHaveTextContent('2')
  })

  it('returns left 0 and the best score when the user is at the cap', async () => {
    state.attempts = [
      completedAttempt('a1', 50),
      completedAttempt('a2', 70),
      completedAttempt('a3', 60),
    ]

    renderHarness('e1', 3)

    await waitFor(() => expect(screen.getByTestId('best')).toHaveTextContent('70'))
    expect(screen.getByTestId('used')).toHaveTextContent('3')
    expect(screen.getByTestId('left')).toHaveTextContent('0')
  })

  it('ignores non-completed attempts when counting used attempts', async () => {
    state.attempts = [
      completedAttempt('a1', 80),
      { ...completedAttempt('a2', 0), status: 'in_progress' },
    ]

    renderHarness('e1', 2)

    await waitFor(() => expect(screen.getByTestId('best')).toHaveTextContent('80'))
    expect(screen.getByTestId('used')).toHaveTextContent('1')
    expect(screen.getByTestId('left')).toHaveTextContent('1')
    expect(screen.getByTestId('count')).toHaveTextContent('2')
  })

  it('keeps left 0 and best 0 when no attempt has run yet', async () => {
    state.attempts = []

    renderHarness('e1', 3)

    await waitFor(() => expect(screen.getByTestId('best')).toHaveTextContent('0'))
    expect(screen.getByTestId('left')).toHaveTextContent('3')
  })
})