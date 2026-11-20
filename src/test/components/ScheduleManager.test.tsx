import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ScheduleManager, { validateScheduleWindow } from '../../components/ScheduleManager'

const mockUpdateDefaultWindow = vi.fn()
const mockCreateExamAssignment = vi.fn()
const mockDeleteExamAssignment = vi.fn()
const mockFetchExamAssignments = vi.fn()

vi.mock('../../lib/exams', () => ({
  fetchExams: vi.fn().mockResolvedValue([
    {
      id: 'ex-1',
      title: 'Grade 7 Monthly Exam',
      type: 'exam',
      grade: 7,
      starts_at: null,
      ends_at: null,
    },
  ]),
}))

vi.mock('../../lib/classes', () => ({
  fetchClasses: vi.fn().mockResolvedValue([
    { id: 'grp-1', name: 'Sat/Tue 5PM', grade: 7 },
    { id: 'grp-2', name: 'Sun/Wed 7PM', grade: 7 },
  ]),
}))

vi.mock('../../lib/groups', () => ({
  fetchExamAssignments: () => mockFetchExamAssignments(),
  createExamAssignment: (...args: unknown[]) => mockCreateExamAssignment(...args),
  deleteExamAssignment: (...args: unknown[]) => mockDeleteExamAssignment(...args),
  updateExamDefaultWindow: (...args: unknown[]) => mockUpdateDefaultWindow(...args),
}))

function renderManager() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ScheduleManager />
    </QueryClientProvider>
  )
}

describe('ScheduleManager — Visual Scheduler & Staggered Group Deadlines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchExamAssignments.mockResolvedValue([
      {
        id: 'asg-1',
        exam_id: 'ex-1',
        target_type: 'group',
        target_grade: null,
        target_group_id: 'grp-1',
        target_student_id: null,
        starts_at_override: '2026-11-21T15:00:00.000Z',
        ends_at_override: '2026-11-21T17:00:00.000Z',
        created_by: 't-1',
        created_at: '2026-11-20T00:00:00.000Z',
      },
    ])
    mockUpdateDefaultWindow.mockResolvedValue(undefined)
    mockCreateExamAssignment.mockResolvedValue({ id: 'asg-2' })
    mockDeleteExamAssignment.mockResolvedValue(undefined)
  })

  it('validates that deadline is after open time', () => {
    expect(
      validateScheduleWindow('2026-11-22T12:00:00Z', '2026-11-21T12:00:00Z')
    ).toMatch(/must be after/i)
    expect(
      validateScheduleWindow('2026-11-21T12:00:00Z', '2026-11-22T12:00:00Z')
    ).toBeNull()
  })

  it('saves default window and creates & removes staggered group slots', async () => {
    renderManager()

    expect(await screen.findByText(/1\. Default Open & Close Window/i)).toBeInTheDocument()

    // Save default window
    fireEvent.change(screen.getByLabelText(/Default opens at/i), {
      target: { value: '2026-11-25T10:00' },
    })
    fireEvent.change(screen.getByLabelText(/Default ends at/i), {
      target: { value: '2026-11-26T10:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Default Window' }))

    await waitFor(() => {
      expect(mockUpdateDefaultWindow).toHaveBeenCalledWith(
        'ex-1',
        expect.any(String),
        expect.any(String)
      )
    })

    // Add staggered group slot for grp-2
    fireEvent.change(screen.getByLabelText(/Select group for staggered slot/i), {
      target: { value: 'grp-2' },
    })
    fireEvent.change(screen.getByLabelText(/Group opens at/i), {
      target: { value: '2026-11-22T17:00' },
    })
    fireEvent.change(screen.getByLabelText(/Group due at/i), {
      target: { value: '2026-11-22T19:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: /\+ Add Group Slot/i }))

    await waitFor(() => {
      expect(mockCreateExamAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          examId: 'ex-1',
          targetType: 'group',
          targetGroupId: 'grp-2',
        })
      )
    })

    // Remove existing staggered slot
    fireEvent.click(screen.getByRole('button', { name: 'Remove Slot' }))
    await waitFor(() => {
      expect(mockDeleteExamAssignment).toHaveBeenCalledWith('asg-1')
    })
  })
})
