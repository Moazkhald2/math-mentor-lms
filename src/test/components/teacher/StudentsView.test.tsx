import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StudentsView from '../../../components/teacher/StudentsView'

const stub = vi.hoisted(() => ({
  tables: {
    profiles: [] as any[],
    exam_attempts: [] as any[],
  },
}))

vi.mock('../../../lib/supabase', () => {
  const makeChain = (table: string) => {
    const chain: any = {}
    const methods = ['select', 'eq', 'order', 'limit', 'ilike', 'in']
    for (const m of methods) chain[m] = vi.fn(() => chain)
    chain.then = (onFulfilled: any) =>
      Promise.resolve({ data: stub.tables[table as keyof typeof stub.tables] ?? [], error: null }).then(onFulfilled)
    return chain
  }
  return { supabase: { from: vi.fn((table: string) => makeChain(table)) } }
})

function renderStudents() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <StudentsView />
    </QueryClientProvider>,
  )
}

describe('StudentsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stub.tables = {
      profiles: [
        { id: 's1', full_name: 'Ahmed Hassan', grade: 10 },
        { id: 's2', full_name: 'Sara Ali', grade: 9 },
      ],
      exam_attempts: [
        { user_id: 's1', score: 100, total_points: 100, status: 'completed' },
        { user_id: 's1', score: 50, total_points: 100, status: 'completed' },
      ],
    }
  })

  it('lists students with attempt counts and average scores', async () => {
    renderStudents()
    expect(await screen.findByText('Ahmed Hassan')).toBeInTheDocument()
    expect(screen.getByText('Sara Ali')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('75%')).toBeInTheDocument())
    expect(screen.getAllByText('2 attempts').length).toBeGreaterThan(0)
    expect(screen.getByText('No attempts yet')).toBeInTheDocument()
  })

  it('filters by search text', async () => {
    renderStudents()
    await screen.findByText('Ahmed Hassan')
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'sara' } })
    expect(screen.queryByText('Ahmed Hassan')).not.toBeInTheDocument()
    expect(screen.getByText('Sara Ali')).toBeInTheDocument()
  })
})
