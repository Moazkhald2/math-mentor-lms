import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import Exams from '../../pages/Exams'

let mockUser: Record<string, unknown> | null = { id: 'user-1', email: 'test@test.com' }

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

function createExam(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    title: 'Default Exam',
    description: 'Default description',
    time_limit_minutes: 60,
    passing_score: 70,
    shuffle_questions: false,
    created_by: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    is_published: true,
    type: 'exam' as const,
    grade: 10,
    starts_at: null,
    ends_at: null,
    ...overrides,
  }
}

const mockExams = [
  createExam({ id: '1', title: 'Algebra Exam', grade: 10 }),
  createExam({
    id: '2',
    title: 'Geometry Practice',
    type: 'practice' as const,
    grade: 10,
    time_limit_minutes: 0,
    passing_score: 0,
  }),
  createExam({ id: '3', title: 'Unpublished Exam', is_published: false }),
  createExam({ id: '4', title: 'Grade 11 Exam', grade: 11 }),
]

describe('ExamsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'user-1', email: 'test@test.com' }

    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === 'exams') {
        return { data: mockExams, isLoading: false } as any
      }
      if (options.queryKey[0] === 'my-grade') {
        return { data: null } as any
      }
      return { data: undefined, isLoading: false } as any
    })
  })

  it('renders loading state', () => {
    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === 'exams') {
        return { data: undefined, isLoading: true } as any
      }
      return { data: null } as any
    })

    render(<Exams />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders empty state when no exams', () => {
    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === 'exams') {
        return { data: [], isLoading: false } as any
      }
      return { data: null } as any
    })

    render(<Exams />)
    expect(screen.getByText('No exams available')).toBeInTheDocument()
  })

  it('renders exam cards with correct titles', () => {
    render(<Exams />)
    expect(screen.getByText('Algebra Exam')).toBeInTheDocument()
    expect(screen.getByText('Geometry Practice')).toBeInTheDocument()
  })

  it('filters exams by student grade', () => {
    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === 'exams') {
        return { data: mockExams, isLoading: false } as any
      }
      if (options.queryKey[0] === 'my-grade') {
        return { data: { grade: 10 } } as any
      }
      return { data: undefined, isLoading: false } as any
    })

    render(<Exams />)

    expect(screen.getByText('Algebra Exam')).toBeInTheDocument()

    expect(screen.queryByText('Grade 11 Exam')).not.toBeInTheDocument()
  })

  it('shows only published exams', () => {
    render(<Exams />)

    expect(screen.queryByText('Unpublished Exam')).not.toBeInTheDocument()
  })

  it('links practice sheets to /practice/:id and exams to /exam/:id', () => {
    render(<Exams />)

    const examLink = screen.getByText('Algebra Exam').closest('a')
    expect(examLink).toHaveAttribute('href', '/exam/1')

    const practiceLink = screen.getByText('Geometry Practice').closest('a')
    expect(practiceLink).toHaveAttribute('href', '/practice/2')
  })

  it('cards are clickable via <a> tags with href', () => {
    render(<Exams />)

    const examLink = screen.getByText('Algebra Exam').closest('a')
    expect(examLink).toHaveAttribute('href')
    expect(examLink?.getAttribute('href')).toBeTruthy()

    const practiceLink = screen.getByText('Geometry Practice').closest('a')
    expect(practiceLink).toHaveAttribute('href')
    expect(practiceLink?.getAttribute('href')).toBeTruthy()
  })
})
