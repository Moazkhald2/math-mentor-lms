import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminExams from '../../pages/admin/AdminExams'

const stub = vi.hoisted(() => ({
  exams: [] as any[],
  update: null as any,
  insert: null as any,
}))

vi.mock('../../lib/supabase', () => {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    update: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: stub.exams[0], error: null })),
  }
  chain.then = (onFulfilled: any) =>
    Promise.resolve({ data: stub.exams, error: null }).then(onFulfilled)
  chain.from = vi.fn(() => chain)
  stub.update = chain.update
  stub.insert = chain.insert
  return { supabase: { from: chain.from } }
})

function createExam(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    title: 'Algebra Exam',
    description: 'Default description',
    time_limit_minutes: 60,
    passing_score: 70,
    shuffle_questions: false,
    created_by: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    is_published: true,
    is_template: false,
    type: 'exam' as const,
    grade: 10,
    starts_at: null,
    ends_at: null,
    max_attempts: 3,
    cooldown_hours: 24,
    ...overrides,
  }
}

function renderAdmin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminExams />
    </QueryClientProvider>
  )
}

describe('AdminExams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stub.exams = []
  })

  it('shows the attempt limit on the admin row', async () => {
    stub.exams = [createExam({ id: '1', title: 'Algebra Exam', max_attempts: 5 })]
    renderAdmin()

    expect(await screen.findByText('Algebra Exam')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders max attempts and cooldown fields in the edit modal', async () => {
    stub.exams = [createExam()]
    const user = userEvent.setup()
    renderAdmin()

    await screen.findByText('Algebra Exam')
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(await screen.findByText('Max Attempts')).toBeInTheDocument()
    expect(screen.getByText('Cooldown (hours)')).toBeInTheDocument()
    expect(screen.getByDisplayValue('3')).toBeInTheDocument()
    expect(screen.getByDisplayValue('24')).toBeInTheDocument()
  })

  it('save submits the new attempt settings', async () => {
    stub.exams = [createExam()]
    const user = userEvent.setup()
    renderAdmin()

    await screen.findByText('Algebra Exam')
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const maxInput = await screen.findByDisplayValue('3')
    const cooldownInput = screen.getByDisplayValue('24')
    await user.clear(maxInput)
    await user.type(maxInput, '5')
    await user.clear(cooldownInput)
    await user.type(cooldownInput, '48')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(stub.update).toHaveBeenCalledWith(
        expect.objectContaining({ max_attempts: 5, cooldown_hours: 48 })
      )
    })
  })

  it('clamps invalid attempt settings when saving', async () => {
    stub.exams = [createExam()]
    const user = userEvent.setup()
    renderAdmin()

    await screen.findByText('Algebra Exam')
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const maxInput = await screen.findByDisplayValue('3')
    const cooldownInput = screen.getByDisplayValue('24')
    fireEvent.change(maxInput, { target: { value: '0' } })
    fireEvent.change(cooldownInput, { target: { value: '-5' } })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(stub.update).toHaveBeenCalledWith(
        expect.objectContaining({ max_attempts: 3, cooldown_hours: 0 })
      )
    })
  })
})