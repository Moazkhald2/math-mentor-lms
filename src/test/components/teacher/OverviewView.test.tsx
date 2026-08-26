import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OverviewView from '../../../components/teacher/OverviewView'

const stub = vi.hoisted(() => ({
  tables: {
    exams: [] as any[],
    exam_attempts: [] as any[],
    activity_logs: [] as any[],
  },
}))

vi.mock('../../../lib/supabase', () => {
  const makeChain = (table: string) => {
    const chain: any = {}
    const methods = ['select', 'eq', 'in', 'order', 'limit', 'ilike', 'gte']
    for (const m of methods) chain[m] = vi.fn(() => chain)
    chain.then = (onFulfilled: any) =>
      Promise.resolve({ data: stub.tables[table as keyof typeof stub.tables] ?? [], error: null }).then(onFulfilled)
    return chain
  }
  return {
    supabase: {
      from: vi.fn((table: string) => makeChain(table)),
    },
  }
})

function renderOverview() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <OverviewView userId="teacher-1" />
    </QueryClientProvider>,
  )
}

describe('OverviewView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stub.tables = {
      exams: [
        { id: 'e1', title: 'Circle Theorems', is_published: true },
        { id: 'e2', title: 'Algebra Basics', is_published: false },
        { id: 'e3', title: 'Trig Weekly', is_published: true },
      ],
      exam_attempts: [
        { score: 80, total_points: 100, status: 'completed', started_at: new Date().toISOString(), user_id: 's1', exam_id: 'e1', profiles: { full_name: 'Ahmed' }, exams: { title: 'Circle Theorems' } },
        { score: 60, total_points: 100, status: 'completed', started_at: new Date().toISOString(), user_id: 's2', exam_id: 'e1', profiles: { full_name: 'Sara' }, exams: { title: 'Circle Theorems' } },
        { score: 40, total_points: 100, status: 'completed', started_at: new Date(Date.now() - 20 * 864e5).toISOString(), user_id: 's1', exam_id: 'e2', profiles: { full_name: 'Ahmed' }, exams: { title: 'Algebra Basics' } },
        { score: null, total_points: 100, status: 'in_progress', started_at: new Date().toISOString(), user_id: 's3', exam_id: 'e2', profiles: { full_name: 'Mona' }, exams: { title: 'Algebra Basics' } },
      ],
      activity_logs: [
        { id: 'l1', created_at: new Date().toISOString(), action: 'anti_cheat_violation' },
        { id: 'l2', created_at: new Date().toISOString(), action: 'anti_cheat_violation' },
      ],
    }
  })

  it('renders KPI cards from real data', async () => {
    renderOverview()
    expect(await screen.findByText('My Exams')).toBeInTheDocument()
    // 2 of 3 exams are published
    expect(await screen.findByText('2 published')).toBeInTheDocument()
    // avg of completed attempts: (80+60+40)/3 = 60 — also matches Sara's row score
    await waitFor(() => expect(screen.getAllByText('60%').length).toBeGreaterThan(0))
    expect(screen.getByText('Flagged Violations')).toBeInTheDocument()
  })

  it('lists recent completed submissions with student and exam names', async () => {
    renderOverview()
    expect((await screen.findAllByText(/Ahmed/)).length).toBeGreaterThan(0)
    expect(screen.getByText(/Sara/)).toBeInTheDocument()
    expect(screen.getByText('Recent Submissions')).toBeInTheDocument()
  })
})
