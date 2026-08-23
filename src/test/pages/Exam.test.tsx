import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Exam from '../../pages/Exam'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com' } }),
}))

vi.mock('../../lib/exams', () => ({
  fetchExamQuestions: vi.fn(async () => [
    {
      id: '1',
      question_id: 'q1',
      exam_id: '1',
      order_index: 0,
      points: 1,
      question: {
        id: 'q1',
        question_text: 'What is 2 + 2?',
        type: 'short_answer',
        correct_answer: '4',
        difficulty: 1,
        points: 1,
        image_url: null,
        options: [],
        grade: 10,
        variant_group_id: null,
      },
    },
  ]),
  fetchVariantPool: vi.fn(async () => []),
  startAttempt: vi.fn(async (..._args: any[]) => ({ id: 'attempt-1', seed: 'seed-1', attempt_number: 1 })),
  fetchStudentAttempts: vi.fn(async () => []),
  getBestScore: vi.fn((attempts: any[]) =>
    Math.max(0, ...attempts.filter((a: any) => a.status === 'completed').map((a: any) => a.score ?? 0)),
  ),
  cooldownRemainingMs: vi.fn(() => 0),
  saveAnswer: vi.fn(async (..._args: any[]) => ({ id: 'answer-1' })),
  submitAnswer: vi.fn(async (..._args: any[]) => ({ id: 'answer-1' })),
  completeAttempt: vi.fn(async (..._args: any[]) => ({ id: 'attempt-1' })),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const chain = {
        select: () => {
          const eqChain = {
            single: () => {
              if (table === 'exams') {
                return Promise.resolve({
                  data: {
                    id: '1',
                    is_published: true,
                    shuffle_questions: false,
                    grade: 10,
                    type: 'exam',
                    time_limit_minutes: 60,
                    passing_score: 70,
                    created_by: 'admin',
                    created_at: '2024-01-01T00:00:00Z',
                    description: 'Test exam',
                    starts_at: null,
                    ends_at: null,
                    max_attempts: 3,
                    cooldown_hours: 0,
                  },
                })
              } else if (table === 'profiles') {
                return Promise.resolve({ data: { grade: 10 } })
              }
              return Promise.resolve({ data: null })
            },
          }
          const eq = () => eqChain
          return { eq }
        },
        insert: () => Promise.resolve({ data: null, error: null }),
      }
      return chain
    },
  },
}))

vi.mock('../../components/AntiCheatGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const renderExam = () => {
  const queryClient = new QueryClient()
  return render(
    <MemoryRouter initialEntries={['/exam/1']}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/exam/:id" element={<Exam />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('Exam Save and Submit Buttons', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  it('renders save and submit buttons', async () => {
    renderExam()
    await waitFor(() => {
      const saveButton = screen.getByText('Save')
      expect(saveButton).toBeInTheDocument()
      const submitButton = screen.getByText('Submit')
      expect(submitButton).toBeInTheDocument()
    })
  })

  it('save button calls saveAnswer when clicked', async () => {
    const examsLib = await import('../../lib/exams')
    vi.mocked(examsLib.saveAnswer).mockImplementation(async (..._args: any[]): Promise<any> => ({ id: 'answer-1' }))

    renderExam()
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Type your answer...')
      fireEvent.change(input, { target: { value: '4' } })
    })
    await waitFor(() => {
      const saveButton = screen.getByText('Save').closest('button')
      fireEvent.click(saveButton!)
    })

    expect(vi.mocked(examsLib.saveAnswer)).toHaveBeenCalled()
  })

  it('submit button calls submitAnswer when clicked', async () => {
    const examsLib = await import('../../lib/exams')
    vi.mocked(examsLib.submitAnswer).mockImplementation(async (..._args: any[]): Promise<any> => ({ id: 'answer-1' }))

    renderExam()
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Type your answer...')
      fireEvent.change(input, { target: { value: '4' } })
    })
    await waitFor(() => {
      const submitButton = screen.getByText('Submit').closest('button')
      fireEvent.click(submitButton!)
    })

    expect(vi.mocked(examsLib.submitAnswer)).toHaveBeenCalled()
  })

  it('submit button shows confirmation when unanswered questions exist', async () => {
    renderExam()
    await waitFor(() => {
      const submitButton = screen.getByText('Submit').closest('button')
      fireEvent.click(submitButton!)
    })

    await waitFor(() => {
      expect(screen.getByText('Submit Exam?')).toBeInTheDocument()
    })
  })

  it('fetches the variant pool with the group ids present in the exam', async () => {
    const examsLib = await import('../../lib/exams')
    renderExam()
    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeInTheDocument()
    })
    expect(vi.mocked(examsLib.fetchVariantPool)).toHaveBeenCalled()
  })

  it('shows watermark during the exam', async () => {
    renderExam()
    await waitFor(() => {
      expect(screen.getAllByText(/@test\.com/).length).toBeGreaterThan(0)
    })
  })

  it('shows the no-attempts-left gate screen and does not auto-start when at the cap', async () => {
    const examsLib = await import('../../lib/exams')
    vi.mocked(examsLib.startAttempt).mockClear()
    vi.mocked(examsLib.fetchStudentAttempts).mockResolvedValue([
      { id: 'a1', exam_id: '1', user_id: 'user-1', status: 'completed', score: 70, total_points: 100, started_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T01:00:00Z' },
      { id: 'a2', exam_id: '1', user_id: 'user-1', status: 'completed', score: 85, total_points: 100, started_at: '2024-01-02T00:00:00Z', completed_at: '2024-01-02T01:00:00Z' },
      { id: 'a3', exam_id: '1', user_id: 'user-1', status: 'completed', score: 90, total_points: 100, started_at: '2024-01-03T00:00:00Z', completed_at: '2024-01-03T01:00:00Z' },
    ] as any)

    renderExam()

    await waitFor(() => {
      expect(screen.getByText('No attempts left')).toBeInTheDocument()
    })
    expect(screen.getByText(/Your best score: 90%/)).toBeInTheDocument()
    expect(vi.mocked(examsLib.startAttempt)).not.toHaveBeenCalled()
  })

  it('shows the cooldown gate and does not autostart when a cooldown is active', async () => {
    const examsLib = await import('../../lib/exams')
    vi.mocked(examsLib.startAttempt).mockClear()
    vi.mocked(examsLib.fetchStudentAttempts).mockResolvedValue([
      {
        id: 'a1', exam_id: '1', user_id: 'user-1', status: 'completed', score: 80, total_points: 100,
        started_at: new Date(Date.now() - 3600e3).toISOString(),
        completed_at: new Date(Date.now() - 3600e3).toISOString(),
      },
    ] as any)
    vi.mocked(examsLib.cooldownRemainingMs).mockReturnValue(12 * 3600e3)

    renderExam()

    await waitFor(() => {
      expect(screen.getByText('Too soon to retake')).toBeInTheDocument()
    })
    expect(screen.getByText(/about 12 hours/)).toBeInTheDocument()
    expect(vi.mocked(examsLib.startAttempt)).not.toHaveBeenCalled()
  })

  it('does not start or render exam content while attempts are still loading', async () => {
    const examsLib = await import('../../lib/exams')
    vi.mocked(examsLib.startAttempt).mockClear()
    vi.mocked(examsLib.fetchStudentAttempts).mockReturnValue(new Promise(() => {}))
    vi.mocked(examsLib.cooldownRemainingMs).mockReturnValue(0)

    renderExam()

    await new Promise(resolve => setTimeout(resolve, 80))
    expect(vi.mocked(examsLib.startAttempt)).not.toHaveBeenCalled()
    expect(screen.queryByText(/Loading exam/)).toBeInTheDocument()
    expect(screen.queryAllByText(/@test\.com/).length).toBe(0)
    expect(screen.queryByText(/Q1 \/ 1/)).not.toBeInTheDocument()
  })
})
