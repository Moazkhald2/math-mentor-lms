import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Exam from '../../pages/Exam'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com' } }),
}))

const safeQuestionPayload = () => ({
  attempt_id: 'attempt-1',
  started_at: new Date().toISOString(),
  server_now: new Date().toISOString(),
  questions: [
    {
      id: '1',
      question_id: 'q1',
      exam_id: '1',
      order_index: 0,
      points: 1,
      question: {
        id: 'q1',
        question_text: 'What is 2 + 2?',
        type: 'short_answer' as const,
        subject: 'Math',
        topic: 'Arithmetic',
        difficulty: 1 as const,
        image_url: '',
        options: [],
        variant_group_id: null,
        params: null,
      },
    },
  ],
  variants: [],
})

vi.mock('../../lib/exams', () => ({
  fetchExamQuestionsSafe: vi.fn(async () => safeQuestionPayload()),
  startAttempt: vi.fn(async (..._args: any[]) => ({ id: 'attempt-1', seed: 'seed-1', attempt_number: 1 })),
  fetchStudentAttempts: vi.fn(async () => []),
  getBestScore: vi.fn((attempts: any[]) =>
    Math.max(0, ...attempts.filter((a: any) => a.status === 'completed').map((a: any) => a.score ?? 0)),
  ),
  cooldownRemainingMs: vi.fn(() => 0),
  saveAnswersBatch: vi.fn(async (..._args: any[]) => ({ saved: 1 })),
  submitExamSecure: vi.fn(async (..._args: any[]) => ({
    score: 100,
    total_points: 1,
    earned_points: 1,
    status: 'completed',
  })),
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

vi.mock('../../components/LatexRenderer', () => ({
  default: ({ content }: { content: string }) => <span>{content}</span>,
}))

const renderExam = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter initialEntries={['/exam/1']}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/exam/:id" element={<Exam />} />
          <Route path="/results/:attemptId" element={<div>Results page</div>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('Exam Secure Answer-Key Lock & Submission Flow', () => {
  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    const examsLib = await import('../../lib/exams')
    vi.mocked(examsLib.fetchExamQuestionsSafe).mockReset()
    vi.mocked(examsLib.fetchExamQuestionsSafe).mockImplementation(async () => safeQuestionPayload())
    vi.mocked(examsLib.startAttempt).mockReset()
    vi.mocked(examsLib.startAttempt).mockImplementation(async () => ({ id: 'attempt-1', seed: 'seed-1', attempt_number: 1 }) as any)
    vi.mocked(examsLib.fetchStudentAttempts).mockReset()
    vi.mocked(examsLib.fetchStudentAttempts).mockResolvedValue([])
    vi.mocked(examsLib.cooldownRemainingMs).mockReset()
    vi.mocked(examsLib.cooldownRemainingMs).mockReturnValue(0)
    vi.mocked(examsLib.saveAnswersBatch).mockReset()
    vi.mocked(examsLib.saveAnswersBatch).mockResolvedValue({ saved: 1 })
    vi.mocked(examsLib.submitExamSecure).mockReset()
    vi.mocked(examsLib.submitExamSecure).mockResolvedValue({
      score: 100,
      total_points: 1,
      earned_points: 1,
      status: 'completed',
    })
  })

  it('renders save and submit buttons and loads questions via safe RPC with active attemptId', async () => {
    const examsLib = await import('../../lib/exams')
    renderExam()
    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument()
      expect(screen.getByText('Submit')).toBeInTheDocument()
    })
    expect(vi.mocked(examsLib.fetchExamQuestionsSafe)).toHaveBeenCalledWith('1', 'attempt-1')
  })

  it('save button calls saveAnswersBatch RPC when clicked', async () => {
    const examsLib = await import('../../lib/exams')
    renderExam()
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Type your answer...')
      fireEvent.change(input, { target: { value: '4' } })
    })
    await waitFor(() => {
      const saveButton = screen.getByText('Save').closest('button')
      fireEvent.click(saveButton!)
    })

    expect(vi.mocked(examsLib.saveAnswersBatch)).toHaveBeenCalledWith('attempt-1', { q1: '4' })
  })

  it('submit button calls submitExamSecure exclusively and guards against duplicate clicks', async () => {
    const examsLib = await import('../../lib/exams')
    let resolveSubmit!: (v: any) => void
    vi.mocked(examsLib.submitExamSecure).mockImplementation(
      () => new Promise((r) => { resolveSubmit = r })
    )

    renderExam()
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Type your answer...')
      fireEvent.change(input, { target: { value: '4' } })
    })

    const submitButton = screen.getByText('Submit').closest('button')!
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    expect(vi.mocked(examsLib.submitExamSecure)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(examsLib.submitExamSecure)).toHaveBeenCalledWith('attempt-1', { q1: '4' })

    resolveSubmit({ score: 100, total_points: 1, earned_points: 1, status: 'completed' })
    expect(await screen.findByText('Results page')).toBeInTheDocument()
  })

  it('submits canonical original option index for shuffled multiple-choice without correct_answer on client', async () => {
    const examsLib = await import('../../lib/exams')
    vi.mocked(examsLib.fetchExamQuestionsSafe).mockResolvedValue({
      attempt_id: 'attempt-1',
      started_at: new Date().toISOString(),
      server_now: new Date().toISOString(),
      questions: [
        {
          id: 'eq-mcq',
          question_id: 'q-mcq',
          exam_id: '1',
          order_index: 0,
          points: 2,
          question: {
            id: 'q-mcq',
            question_text: 'Pick seven',
            type: 'multiple_choice',
            subject: 'Math',
            topic: 'Numbers',
            difficulty: 1,
            image_url: '',
            options: ['Three', 'Five', 'Seven', 'Nine'],
            variant_group_id: null,
            params: null,
          },
        },
      ],
      variants: [],
    })

    renderExam()
    const sevenBtn = await screen.findByText('Seven')
    fireEvent.click(sevenBtn.closest('button')!)

    const submitBtn = screen.getByText('Submit').closest('button')!
    fireEvent.click(submitBtn)

    await waitFor(() => {
      // 'Seven' is originalIndex 2 regardless of shuffled display position
      expect(vi.mocked(examsLib.submitExamSecure)).toHaveBeenCalledWith('attempt-1', { 'q-mcq': '2' })
    })
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

  it('shows watermark during the exam', async () => {
    renderExam()
    await waitFor(() => {
      expect(screen.getAllByText(/@test\.com/).length).toBeGreaterThan(0)
    })
  })

  it('shows the no-attempts-left gate screen and does not auto-start when at the cap', async () => {
    const examsLib = await import('../../lib/exams')
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
    expect(vi.mocked(examsLib.fetchExamQuestionsSafe)).not.toHaveBeenCalled()
  })

  it('shows the cooldown gate and does not autostart when a cooldown is active', async () => {
    const examsLib = await import('../../lib/exams')
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
    expect(vi.mocked(examsLib.fetchExamQuestionsSafe)).not.toHaveBeenCalled()
  })

  it('does not start or render exam content while attempts are still loading', async () => {
    const examsLib = await import('../../lib/exams')
    vi.mocked(examsLib.fetchStudentAttempts).mockReturnValue(new Promise(() => {}))

    renderExam()

    await new Promise(resolve => setTimeout(resolve, 80))
    expect(vi.mocked(examsLib.startAttempt)).not.toHaveBeenCalled()
    expect(vi.mocked(examsLib.fetchExamQuestionsSafe)).not.toHaveBeenCalled()
    expect(screen.queryByText(/Loading exam/)).toBeInTheDocument()
    expect(screen.queryAllByText(/@test\.com/).length).toBe(0)
    expect(screen.queryByText(/Q1 \/ 1/)).not.toBeInTheDocument()
  })
})
