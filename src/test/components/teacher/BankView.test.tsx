import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BankView from '../../../components/teacher/BankView'

const stub = vi.hoisted(() => ({
  questions: [] as any[],
}))

vi.mock('../../../lib/questions', () => ({
  fetchQuestions: vi.fn(async () => stub.questions),
}))

function renderBank() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <BankView />
    </QueryClientProvider>,
  )
}

describe('BankView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stub.questions = [
      { id: 'q1', topic: 'circle_theorems', type: 'multiple_choice', difficulty: 2, grade: 10 },
      { id: 'q2', topic: 'factorization', type: 'short_answer', difficulty: 3, grade: 9 },
      { id: 'q3', topic: 'trigonometry', type: 'true_false', difficulty: 1, grade: 10 },
    ]
  })

  it('renders summary and all questions', async () => {
    renderBank()
    expect(await screen.findByText('3 questions')).toBeInTheDocument()
    expect(screen.getByText('circle_theorems')).toBeInTheDocument()
    expect(screen.getByText('factorization')).toBeInTheDocument()
  })

  it('filters by difficulty', async () => {
    renderBank()
    await screen.findByText('3 questions')
    fireEvent.change(screen.getByLabelText(/difficulty/i), { target: { value: '2' } })
    await waitFor(() => expect(screen.queryByText('factorization')).not.toBeInTheDocument())
    expect(screen.getByText('circle_theorems')).toBeInTheDocument()
    expect(screen.getByText('1 of 3 questions')).toBeInTheDocument()
  })
})
