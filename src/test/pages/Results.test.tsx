import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Results from '../../pages/Results'

const state = vi.hoisted(() => ({ attempt: null as any, answers: null as any }))
const bestScoreState = vi.hoisted(() => ({ data: null as any }))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com' } }),
}))

vi.mock('../../hooks/useBestScore', () => ({
  useBestScore: () => ({ data: bestScoreState.data }),
}))

vi.mock('../../lib/supabase', () => {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: state.attempt, error: null })),
    then: (onFulfilled: any) =>
      Promise.resolve({ data: state.answers, error: null }).then(onFulfilled),
  }
  return {
    supabase: {
      from: vi.fn(() => chain),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  }
})

vi.mock('../../components/LatexRenderer', () => ({
  default: () => <span data-testid="latex" />,
}))

vi.mock('../../components/BookmarkButton', () => ({
  default: () => <span data-testid="bookmark" />,
}))

vi.mock('../../components/FeedbackButton', () => ({
  default: () => <span data-testid="feedback" />,
}))

const attempt = {
  id: 'a1',
  exam_id: 'e1',
  user_id: 'user-1',
  started_at: '2026-01-01T00:00:00Z',
  completed_at: '2026-01-01T00:30:00Z',
  score: 55,
  total_points: 100,
  status: 'completed',
  exam: {
    title: 'Algebra Exam',
    passing_score: 70,
    max_attempts: 3,
  },
}

const answers = [
  {
    id: 'ans1',
    attempt_id: 'a1',
    question_id: 'q1',
    answer: '4',
    is_correct: true,
    points_earned: 1,
    question: {
      id: 'q1',
      type: 'short_answer',
      question_text: 'What is 2 + 2?',
      options: [],
      correct_answer: '4',
      explanation: '',
      common_mistakes: [],
      difficulty: 1,
      subject: 'math',
      topic: 'arithmetic',
      variant_group_id: null,
      created_by: 'x',
      created_at: '2026-01-01T00:00:00Z',
      image_url: '',
    },
  },
]

function renderResults() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <MemoryRouter initialEntries={['/results/a1']}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/results/:attemptId" element={<Results />} />
          <Route path="/exam/:id" element={<div>Exam page stub</div>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('Results best score and attempts left', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.attempt = attempt
    state.answers = answers
    bestScoreState.data = null
  })

  it('shows the best score across attempts and the attempts-left count', async () => {
    bestScoreState.data = {
      attempts: [attempt, { ...attempt, id: 'a2', score: 85 }],
      best: 85,
      used: 1,
      left: 2,
    }

    renderResults()

    expect(await screen.findByText('Algebra Exam')).toBeInTheDocument()
    expect(screen.getByText(/Best score across attempts:/)).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText(/2 attempts left/)).toBeInTheDocument()
  })

  it('shows the singular attempts-left wording when one attempt remains', async () => {
    bestScoreState.data = {
      attempts: [attempt, { ...attempt, id: 'a2', score: 90 }],
      best: 90,
      used: 2,
      left: 1,
    }

    renderResults()

    expect(await screen.findByText(/Best score across attempts:/)).toBeInTheDocument()
    expect(screen.getByText(/1 attempt left/)).toBeInTheDocument()
  })

  it('shows a Take another attempt link to the exam when attempts remain', async () => {
    bestScoreState.data = {
      attempts: [attempt],
      best: 55,
      used: 1,
      left: 2,
    }

    renderResults()

    const link = await screen.findByRole('link', { name: /Take another attempt/i })
    expect(link).toHaveAttribute('href', '/exam/e1')
  })

  it('shows the maxed-out message and no Take another attempt link at the cap', async () => {
    bestScoreState.data = {
      attempts: [attempt, { ...attempt, id: 'a2', score: 70 }, { ...attempt, id: 'a3', score: 65 }],
      best: 70,
      used: 3,
      left: 0,
    }

    renderResults()

    expect(await screen.findByText(/You've reached the maximum of 3 attempts/)).toBeInTheDocument()
    expect(screen.getByText(/your best score is 70%/)).toBeInTheDocument()
    expect(screen.queryByText(/attempts left/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Take another attempt/i })).not.toBeInTheDocument()
  })
})