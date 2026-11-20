import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Sheets from '../../pages/Sheets'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'student-1', email: 's@test.com' },
  }),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { grade: 7 }, error: null })),
        })),
      })),
    })),
  },
}))

vi.mock('../../lib/exams', () => ({
  fetchExams: vi.fn(),
}))

vi.mock('../../lib/practice', () => ({
  fetchUserPracticeProgress: vi.fn(),
}))

import { fetchExams } from '../../lib/exams'
import { fetchUserPracticeProgress } from '../../lib/practice'

function renderSheets() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Sheets />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Sheets page save & resume indicators', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('math_mentor_current_grade', '7')
  })

  it('shows In Progress badge, X / Y answered progress bar, and Resume Sheet CTA for saved sheets', async () => {
    vi.mocked(fetchExams).mockResolvedValue([
      {
        id: 'sheet-1',
        title: 'Linear Equations Sheet',
        description: 'Solve one-step and two-step equations',
        type: 'practice',
        is_published: true,
        grade: 7,
        time_limit_minutes: null,
      },
      {
        id: 'sheet-2',
        title: 'Fractions Review Sheet',
        description: 'Add and subtract fractions',
        type: 'practice',
        is_published: true,
        grade: 7,
        time_limit_minutes: null,
      },
    ] as any)

    vi.mocked(fetchUserPracticeProgress).mockResolvedValue({
      'sheet-1': {
        examId: 'sheet-1',
        attemptId: 'att-99',
        answeredCount: 3,
        totalQuestions: 5,
        currentIndex: 3,
        updatedAt: new Date().toISOString(),
      },
    })

    renderSheets()

    await waitFor(() => {
      expect(screen.getByText('Linear Equations Sheet')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('3 / 5 answered')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
      expect(screen.getByText('Resume Sheet →')).toBeInTheDocument()
      expect(screen.getByText('Start Practice →')).toBeInTheDocument()
      // Strict grade isolation: students do NOT see Grade 1-12 selector tabs
      expect(screen.queryByRole('button', { name: 'Grade 9' })).not.toBeInTheDocument()
    })
  })
})
