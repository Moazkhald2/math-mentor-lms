import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ExamsView from '../../../components/teacher/ExamsView'

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

const clipboardWrite = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: clipboardWrite },
  configurable: true,
})

function renderExams() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ExamsView userId="teacher-1" />
    </QueryClientProvider>,
  )
}

describe('ExamsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stub.updates = []
    stub.tables = {
      exams: [
        { id: 'e1', title: 'Circle Theorems', grade: 10, type: 'exam', is_published: true, created_by: 'teacher-1' },
        { id: 'e2', title: 'Someone Else Exam', grade: 9, type: 'exam', is_published: false, created_by: 'teacher-9' },
      ],
      exam_attempts: [
        { exam_id: 'e1', score: 90, total_points: 100, status: 'completed' },
        { exam_id: 'e1', score: 70, total_points: 100, status: 'completed' },
      ],
    }
  })

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

  it('copies a telegram report to clipboard', async () => {
    const user = userEvent.setup()
    renderExams()
    const btn = await screen.findByRole('button', { name: /copy report/i })
    await user.click(btn)
    await waitFor(() => expect(clipboardWrite).toHaveBeenCalled())
    const text = clipboardWrite.mock.calls[0][0] as string
    expect(text).toContain('Circle Theorems')
    expect(text).toContain('80%')
  })
})
