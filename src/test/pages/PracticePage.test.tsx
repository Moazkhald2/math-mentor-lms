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
  fetchPracticeQuestionsSafe: vi.fn(),
  resumeOrStartPractice: vi.fn(),
  upsertAnswer: vi.fn(),
  finishPractice: vi.fn(),
  savePracticeCheckpoint: vi.fn(),
  loadPracticeCheckpoint: vi.fn(() => null),
  clearPracticeCheckpoint: vi.fn(),
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
  jitterQuestion: (q: any) => ({ question_text: q.question_text, options: q.options ?? [], correct_answer: q.correct_answer }),
  hashString: (s: string) => s.length,
}))

import { supabase } from '../../lib/supabase'
import {
  fetchPracticeQuestionsSafe,
  resumeOrStartPractice,
  upsertAnswer,
  finishPractice,
  savePracticeCheckpoint,
  loadPracticeCheckpoint,
  clearPracticeCheckpoint,
} from '../../lib/practice'

function renderPractice() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practice/exam-1']}>
        <Routes>
          <Route path="/practice/:id" element={<Practice />} />
          <Route path="/sheets" element={<div>Sheets Page</div>} />
          <Route path="/results/:attemptId" element={<div>Results Page</div>} />
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

const makeQuestion = (id: string, text: string) => ({
  id: `eq-${id}`,
  exam_id: 'exam-1',
  question_id: id,
  order_index: 1,
  points: 1,
  question: {
    id,
    type: 'multiple_choice' as const,
    question_text: text,
    options: ['3', '4', '5'],
    correct_answer: '1',
    explanation: '2+2=4',
    subject: 'math',
    topic: 'algebra',
    difficulty: 1 as const,
    image_url: '',
    common_mistakes: [],
    created_by: '',
    created_at: '',
    variant_group_id: null,
  },
})

describe('PracticePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadPracticeCheckpoint).mockReturnValue(null)
  })

  it('starts or resumes a practice attempt on mount', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(resumeOrStartPractice).mockResolvedValue({ attempt: mockAttempt, answers: [], resumed: false })

    vi.mocked(fetchPracticeQuestionsSafe).mockResolvedValue([makeQuestion('q-1', 'What is 2+2?')])
    const qb = createQueryBuilder([])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => {
      expect(resumeOrStartPractice).toHaveBeenCalledWith('exam-1', 'user-1')
    })
  })

  it('upserts answer and checkpoints progress when user submits', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(resumeOrStartPractice).mockResolvedValue({ attempt: mockAttempt, answers: [], resumed: false })
    vi.mocked(upsertAnswer).mockResolvedValue({ id: 'ans-1' } as any)
    vi.mocked(fetchPracticeQuestionsSafe).mockResolvedValue([makeQuestion('q-1', 'What is 2+2?')])

    const qb = createQueryBuilder([])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => expect(screen.getByText('What is 2+2?')).toBeInTheDocument())
    await userEvent.click(screen.getByText('4'))
    await userEvent.click(screen.getByText('Submit Answer'))

    await waitFor(() => {
      expect(upsertAnswer).toHaveBeenCalledWith('att-1', 'q-1', '1', true, expect.any(Number))
      expect(savePracticeCheckpoint).toHaveBeenCalledWith(
        expect.objectContaining({
          attemptId: 'att-1',
          examId: 'exam-1',
          userId: 'user-1',
          totalQuestions: 1,
          answeredMap: { 'q-1': { answer: '1', isCorrect: true } },
        })
      )
    })
  })

  it('saves checkpoint and returns to /sheets when clicking Save & Exit', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(resumeOrStartPractice).mockResolvedValue({ attempt: mockAttempt, answers: [], resumed: false })
    vi.mocked(fetchPracticeQuestionsSafe).mockResolvedValue([
      makeQuestion('q-1', 'Question One'),
      makeQuestion('q-2', 'Question Two'),
    ])

    const qb = createQueryBuilder([])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => expect(screen.getByText('Question One')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Save & Exit/i }))

    await waitFor(() => {
      expect(savePracticeCheckpoint).toHaveBeenCalled()
      expect(screen.getByText('Sheets Page')).toBeInTheDocument()
    })
  })

  it('resumes directly at the first unanswered question when returning to an in-progress sheet', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(resumeOrStartPractice).mockResolvedValue({
      attempt: mockAttempt,
      answers: [{ question_id: 'q-1', answer: '1', is_correct: true }],
      resumed: true,
    })
    vi.mocked(fetchPracticeQuestionsSafe).mockResolvedValue([
      makeQuestion('q-1', 'Question One'),
      makeQuestion('q-2', 'Question Two'),
    ])

    const qb = createQueryBuilder([])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => {
      expect(screen.getByText('Question Two')).toBeInTheDocument()
      expect(screen.getByText(/Resumed where you left off/i)).toBeInTheDocument()
      expect(screen.getByText(/1 \/ 2 answered \(50%\)/i)).toBeInTheDocument()
    })
  })

  it('finishes practice, clears checkpoint, and navigates to results', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(resumeOrStartPractice).mockResolvedValue({ attempt: mockAttempt, answers: [], resumed: false })
    vi.mocked(upsertAnswer).mockResolvedValue({ id: 'ans-1' } as any)
    vi.mocked(finishPractice).mockResolvedValue({ id: 'att-1', score: 100, total_points: 1, status: 'completed' } as any)
    vi.mocked(fetchPracticeQuestionsSafe).mockResolvedValue([makeQuestion('q-1', 'What is 2+2?')])

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
      expect(finishPractice).toHaveBeenCalledWith('att-1', 100, 1)
      expect(clearPracticeCheckpoint).toHaveBeenCalledWith('user-1', 'exam-1')
    })
  })

  it('reveals progressive Hint 1 -> Hint 2 -> Full Worked Solution before submitting', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(resumeOrStartPractice).mockResolvedValue({ attempt: mockAttempt, answers: [], resumed: false })
    const qWithHints = makeQuestion('q-1', 'Solve 2x = 8')
    ;(qWithHints.question as any).hints = ['Divide both sides by 2', '8 divided by 2 gives the answer']
    qWithHints.question.explanation = 'Divide both sides by 2 to get x = 4.'
    vi.mocked(fetchPracticeQuestionsSafe).mockResolvedValue([qWithHints])

    const qb = createQueryBuilder([])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => expect(screen.getByText('Solve 2x = 8')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Show Hint 1/i }))
    expect(screen.getByText('Divide both sides by 2')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Show Hint 2/i }))
    expect(screen.getByText('8 divided by 2 gives the answer')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Show Full Worked Solution/i }))
    expect(screen.getByText('Divide both sides by 2 to get x = 4.')).toBeInTheDocument()
  })

  it('shows encouraging feedback on miss and recovers via Question Family similar problem', async () => {
    const mockAttempt: ExamAttempt = { id: 'att-1', exam_id: 'exam-1', user_id: 'user-1', started_at: new Date().toISOString(), completed_at: null, score: null, total_points: 0, status: 'in_progress' } as any
    vi.mocked(resumeOrStartPractice).mockResolvedValue({ attempt: mockAttempt, answers: [], resumed: false })
    vi.mocked(upsertAnswer).mockResolvedValue({ id: 'ans-1' } as any)

    const q1 = makeQuestion('q-1', 'Family Question A')
    ;(q1.question as any).family_id = 'fam-add-1'
    const q2 = makeQuestion('q-2', 'Family Question B')
    ;(q2.question as any).family_id = 'fam-add-1'
    vi.mocked(fetchPracticeQuestionsSafe).mockResolvedValue([q1, q2])

    const qb = createQueryBuilder([])
    vi.mocked(supabase.from).mockReturnValue(qb)
    qb.single = vi.fn(() => Promise.resolve({ data: { id: 'exam-1', title: 'Practice Algebra', type: 'practice', shuffle_questions: false }, error: null }))

    renderPractice()

    await waitFor(() => expect(screen.getByText('Family Question A')).toBeInTheDocument())
    // Pick wrong answer ('3', index 0)
    await userEvent.click(screen.getByText('3'))
    await userEvent.click(screen.getByText('Submit Answer'))

    await waitFor(() => {
      expect(screen.getByText(/Not quite yet/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Try a Similar Problem/i })).toBeInTheDocument()
    })

    // Click Try a Similar Problem -> loads Question Family sibling
    await userEvent.click(screen.getByRole('button', { name: /Try a Similar Problem/i }))
    await waitFor(() => expect(screen.getByText('Family Question B')).toBeInTheDocument())

    // Now answer correctly ('4', index 1) -> Mistake Recovered!
    await userEvent.click(screen.getByText('4'))
    await userEvent.click(screen.getByText('Submit Answer'))

    await waitFor(() => {
      expect(screen.getByText(/Mistake Recovered!/i)).toBeInTheDocument()
    })
  })
})
