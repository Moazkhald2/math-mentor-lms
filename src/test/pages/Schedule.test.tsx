import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Schedule from '../../pages/Schedule'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'stu-1', email: 'salma@example.com' },
    loading: false,
  }),
}))

vi.mock('../../lib/exams', () => ({
  fetchExams: vi.fn().mockResolvedValue([
    {
      id: 'ex-open',
      title: 'Algebra Unit 2 Exam',
      description: '',
      time_limit_minutes: 30,
      passing_score: 60,
      shuffle_questions: true,
      created_by: 't-1',
      created_at: '2026-11-01T00:00:00Z',
      is_published: true,
      type: 'exam',
      grade: 7,
      starts_at: '2026-11-01T00:00:00Z',
      ends_at: '2029-12-31T00:00:00Z',
      max_attempts: 3,
      cooldown_hours: 0,
    },
    {
      id: 'ex-future',
      title: 'Geometry Final Exam',
      description: '',
      time_limit_minutes: 45,
      passing_score: 60,
      shuffle_questions: true,
      created_by: 't-1',
      created_at: '2026-11-01T00:00:00Z',
      is_published: true,
      type: 'exam',
      grade: 7,
      starts_at: '2029-12-01T00:00:00Z',
      ends_at: '2029-12-10T00:00:00Z',
      max_attempts: 1,
      cooldown_hours: 0,
    },
  ]),
}))

vi.mock('../../lib/groups', () => ({
  fetchExamAssignments: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { grade: 7 }, error: null }),
            }),
          }),
        }
      }
      if (table === 'class_members') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ class_id: 'grp-1' }], error: null }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }
    },
  },
}))

function renderSchedule() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Schedule />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Schedule page (/schedule)', () => {
  it('renders monthly calendar, status badges, and filters by status pill', async () => {
    renderSchedule()

    expect(await screen.findByText('Algebra Unit 2 Exam')).toBeInTheDocument()
    expect(screen.getByText('Geometry Final Exam')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Monthly calendar/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Start Exam/i })).toHaveAttribute('href', '/exam/ex-open')

    // Filter to Upcoming only
    fireEvent.click(screen.getByRole('button', { name: /Upcoming \(1\)/i }))
    expect(screen.getByText('Geometry Final Exam')).toBeInTheDocument()
    expect(screen.queryByText('Algebra Unit 2 Exam')).not.toBeInTheDocument()
  })
})
