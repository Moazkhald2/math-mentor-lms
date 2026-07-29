import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Practice from '../../pages/Practice'
import type { ExamAttempt } from '../../types'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../../lib/practice', () => ({
  startPractice: vi.fn(),
  upsertAnswer: vi.fn(),
  finishPractice: vi.fn(),
}))

vi.mock('../../lib/exams', () => ({
  fetchExamQuestions: vi.fn(),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com', user_metadata: { full_name: 'Test' }, email_confirmed_at: 'yes' } }),
}))

vi.mock('../../hooks/useActivityLogger', () => ({
  useActivityLogger: () => ({ log: vi.fn() }),
}))

vi.mock('../../components/LatexRenderer', () => ({
  default: ({ content }: { content: string }) => <>{content}</>,
}))

vi.mock('../../lib/shuffle', () => ({
  seededShuffle: (arr: any[]) => [...arr],
  shuffleMultipleChoice: (opts: string[], correct: string) => ({ options: opts, correctAnswer: correct }),
}))

import { supabase } from '../../lib/supabase'
import { startPractice, upsertAnswer, finishPractice } from '../../lib/practice'
import { fetchExamQuestions } from '../../lib/exams'

function renderPractice() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practice/exam-1']}>
        <Routes>
          <Route path="/practice/:id" element={<Practice />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function createQueryBuilder(returnData: any[] = []) {
  const result = { data: returnData, error: null }
  const then = (onfulfilled: (value: typeof result) => any) => Promise.resolve(result).then(onfulfilled)
  const chain: any = {
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: returnData[0], error: null })),
    insert: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then,
  }
  return chain
}

describe('PracticePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts a practice attempt on mount', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(startPractice).mockResolvedValue(mockAttempt)

    const mockQuestions = [{ id: 'eq-1', question: { id: 'q-1', type: 'multiple_choice', question_text: 'What is 2+2?', options: ['3', '4', '5'], correct_answer: '1', explanation: '2+2=4' } }]
    vi.mocked(fetchExamQuestions).mockResolvedValue(mockQuestions)
    const qb = createQueryBuilder([])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => {
      expect(startPractice).toHaveBeenCalledWith('exam-1', 'user-1')
    })
  })

  it('upserts answer when user submits', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(startPractice).mockResolvedValue(mockAttempt)
    vi.mocked(upsertAnswer).mockResolvedValue({ id: 'ans-1' } as any)
    const mockQuestions = [{ id: 'eq-1', question: { id: 'q-1', type: 'multiple_choice', question_text: 'What is 2+2?', options: ['3', '4', '5'], correct_answer: '1', explanation: '2+2=4' } }]
    vi.mocked(fetchExamQuestions).mockResolvedValue(mockQuestions)

    const qb = createQueryBuilder([])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => expect(screen.getByText('What is 2+2?')).toBeInTheDocument())
    await userEvent.click(screen.getByText('4'))
    await userEvent.click(screen.getByText('Submit Answer'))

    await waitFor(() => {
      expect(upsertAnswer).toHaveBeenCalledWith('att-1', 'q-1', '1', true, expect.any(Number))
    })
  })

  it('finishes practice and navigates to results', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(startPractice).mockResolvedValue(mockAttempt)
    vi.mocked(upsertAnswer).mockResolvedValue({ id: 'ans-1' } as any)
    vi.mocked(finishPractice).mockResolvedValue({ id: 'att-1', score: 1, total_points: 1, status: 'completed' } as any)
    const mockQuestions = [{ id: 'eq-1', question: { id: 'q-1', type: 'multiple_choice', question_text: 'What is 2+2?', options: ['3', '4', '5'], correct_answer: '1', explanation: '2+2=4' } }]
    vi.mocked(fetchExamQuestions).mockResolvedValue(mockQuestions)

    const qb = createQueryBuilder([])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => expect(screen.getByText('What is 2+2?')).toBeInTheDocument())
    await userEvent.click(screen.getByText('4'))
    await userEvent.click(screen.getByText('Submit Answer'))
    await waitFor(() => expect(screen.getByText('See Results')).toBeInTheDocument())
    await userEvent.click(screen.getByText('See Results'))

    await waitFor(() => {
      expect(finishPractice).toHaveBeenCalledWith('att-1', 1, 1)
    })
  })
})
