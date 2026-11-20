import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WrongAnswersView from '../../../components/teacher/WrongAnswersView'

const mockRows = [
  {
    id: 'w1',
    question_id: 'q1',
    answer: 'x = 7',
    is_correct: false,
    exam_attempts: {
      user_id: 's1',
      exam_id: 'ex1',
      profiles: { full_name: 'Salma Hassan', email: 'salma@example.com', grade: 7 },
      exams: { id: 'ex1', title: 'Grade 7 Monthly Exam', grade: 7, type: 'exam' },
    },
    questions: {
      id: 'q1',
      question_text: 'Solve 2x + 3 = 11',
      topic: 'Linear Equations',
      subject: 'Math',
      difficulty: 2,
      type: 'short_answer',
      options: [],
      correct_answer: 'x = 4',
    },
  },
  {
    id: 'w2',
    question_id: 'q1',
    answer: 'x = 7',
    is_correct: false,
    exam_attempts: {
      user_id: 's2',
      exam_id: 'ex1',
      profiles: { full_name: 'Omar Ali', email: 'omar@example.com', grade: 7 },
      exams: { id: 'ex1', title: 'Grade 7 Monthly Exam', grade: 7, type: 'exam' },
    },
    questions: {
      id: 'q1',
      question_text: 'Solve 2x + 3 = 11',
      topic: 'Linear Equations',
      subject: 'Math',
      difficulty: 2,
      type: 'short_answer',
      options: [],
      correct_answer: 'x = 4',
    },
  },
]

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => Promise.resolve({ data: mockRows, error: null }),
        }),
      }),
    }),
  },
}))

function renderView(props: { grade?: number; studentId?: string } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <WrongAnswersView {...props} />
    </QueryClientProvider>
  )
}

describe('WrongAnswersView', () => {
  it('renders KPIs, top reteach topic, and grouped common wrong answers', async () => {
    renderView({ grade: 7 })

    expect(await screen.findByText('2 wrong')).toBeInTheDocument()
    expect(screen.getByText('Most Common Wrong Answers')).toBeInTheDocument()
    expect(screen.getAllByText('Linear Equations').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/2 students \(100%\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Omar Ali, Salma Hassan/)).toBeInTheDocument()
  })

  it('filters by exam dropdown and shows empty state when no mistakes match grade', async () => {
    renderView({ grade: 10 })

    expect(
      await screen.findByText(/No wrong answers found for the selected Grade/i)
    ).toBeInTheDocument()

    const select = screen.getByLabelText(/Filter wrong answers by exam/i)
    fireEvent.change(select, { target: { value: '' } })
    expect(select).toHaveValue('')
  })
})
