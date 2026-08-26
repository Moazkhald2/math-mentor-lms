import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ExamsView, { buildExamReport } from '../../../components/teacher/ExamsView'

const stub = vi.hoisted(() => ({
  tables: {
    exams: [] as any[],
    exam_attempts: [] as any[],
  },
  updates: [] as any[],
}))

vi.mock('../../../lib/supabase', () => {
  const makeChain = (table: string) => {
    const chain: any = {}
    const filters: [string, unknown][] = []
    const methods = ['select', 'order', 'limit', 'ilike', 'in']
    for (const m of methods) chain[m] = vi.fn(() => chain)
    chain.eq = vi.fn((col: string, val: unknown) => {
      filters.push([col, val])
      return chain
    })
    chain.update = vi.fn((payload: any) => {
      stub.updates.push(payload)
      return chain
    })
    chain.then = (onFulfilled: any) =>
      Promise.resolve({ data: stub.tables[table as keyof typeof stub.tables] ?? [], error: null })
        .then((res) => ({
          ...res,
          data: filters.reduce(
            (rows, [col, val]) => rows.filter((r: any) => r[col] === val),
            res.data,
          ),
        }))
        .then(onFulfilled)
    return chain
  }
  return { supabase: { from: vi.fn((table: string) => makeChain(table)) } }
})

const exam = { id: 'e1', title: 'Circle Theorems', grade: 10, type: 'exam' as const, is_published: true, created_by: 'teacher-1' }

describe('buildExamReport', () => {
  it('formats title, attempts, average and pass marker', () => {
    const text = buildExamReport(exam, { count: 12, avg: 80, best: 100 })
    expect(text).toContain('Circle Theorems')
    expect(text).toContain('Grade 10')
    expect(text).toContain('Attempts: 12')
    expect(text).toContain('Average: 80%')
    expect(text).toContain('Best: 100%')
    expect(text).toContain('✅')
  })

  it('warns when class average is below passing', () => {
    const text = buildExamReport(exam, { count: 5, avg: 40, best: 55 })
    expect(text).toContain('⚠️')
    expect(text).not.toContain('✅')
  })
})

describe('ExamsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stub.updates = []
    stub.tables = {
      exams: [
        { ...exam },
        { id: 'e2', title: 'Someone Else Exam', grade: 9, type: 'exam', is_published: false, created_by: 'teacher-9' },
      ],
      exam_attempts: [
        { exam_id: 'e1', score: 90, total_points: 100, status: 'completed' },
        { exam_id: 'e1', score: 70, total_points: 100, status: 'completed' },
      ],
    }
  })

  function renderExams() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={queryClient}>
        <ExamsView userId="teacher-1" />
      </QueryClientProvider>,
    )
  }

  it('lists only my exams with attempt stats and publish badge', async () => {
    renderExams()
    expect(await screen.findByText('Circle Theorems')).toBeInTheDocument()
    expect(screen.queryByText('Someone Else Exam')).not.toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('2 · 80%')).toBeInTheDocument())
  })

  it('toggles publish state via update mutation', async () => {
    const user = userEvent.setup()
    renderExams()
    const toggle = await screen.findByRole('button', { name: /unpublish/i })
    await user.click(toggle)
    await waitFor(() =>
      expect(stub.updates).toEqual(expect.arrayContaining([{ is_published: false }])),
    )
  })
})
