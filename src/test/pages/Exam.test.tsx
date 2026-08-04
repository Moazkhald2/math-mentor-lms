import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Exam from '../../pages/Exam'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com' } }),
}))

vi.mock('../../lib/exams', () => ({
  fetchExamQuestions: async () => [
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
      },
    },
  ],
  startAttempt: async (..._args: any[]) => ({ id: 'attempt-1' }),
  saveAnswer: async (..._args: any[]) => ({ id: 'answer-1' }),
  submitAnswer: async (..._args: any[]) => ({ id: 'answer-1' }),
  completeAttempt: async (..._args: any[]) => ({ id: 'attempt-1' }),
}))

vi.mock('../../lib/supabase', () => ({
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
                } 
              });
            } else if (table === 'profiles') {
              return Promise.resolve({ data: { grade: 10 } });
            }
            return Promise.resolve({ data: null });
          },
        };
        const eq = () => eqChain;
        return { eq };
      },
    };
    return chain;
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
        <Exam />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('Exam Save and Submit Buttons', () => {
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
})
