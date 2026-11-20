import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminClasses from '../../pages/admin/AdminClasses'

const mockFetchClasses = vi.fn()
const mockCreateClass = vi.fn()
const mockDeleteClass = vi.fn()
const mockFetchClassMembers = vi.fn()
const mockAddStudentToClass = vi.fn()
const mockRemoveStudentFromClass = vi.fn()
const mockMoveStudentToClass = vi.fn()
const mockFetchAvailableStudents = vi.fn()
const mockFetchAvailableTeachers = vi.fn()
const mockFetchStudentRecentAttempts = vi.fn()
const mockResetStudentAttempt = vi.fn()

vi.mock('../../lib/classes', () => ({
  fetchClasses: () => mockFetchClasses(),
  createClass: (...args: unknown[]) => mockCreateClass(...args),
  deleteClass: (...args: unknown[]) => mockDeleteClass(...args),
  fetchClassMembers: (...args: unknown[]) => mockFetchClassMembers(...args),
  addStudentToClass: (...args: unknown[]) => mockAddStudentToClass(...args),
  removeStudentFromClass: (...args: unknown[]) => mockRemoveStudentFromClass(...args),
  moveStudentToClass: (...args: unknown[]) => mockMoveStudentToClass(...args),
  fetchAvailableStudents: () => mockFetchAvailableStudents(),
  fetchAvailableTeachers: () => mockFetchAvailableTeachers(),
  fetchStudentRecentAttempts: (...args: unknown[]) => mockFetchStudentRecentAttempts(...args),
  resetStudentAttempt: (...args: unknown[]) => mockResetStudentAttempt(...args),
}))

const mockUpdateGroupInviteSettings = vi.fn()
const mockFetchExamAssignments = vi.fn()
const mockCreateExamAssignment = vi.fn()
const mockDeleteExamAssignment = vi.fn()

vi.mock('../../lib/groups', async () => {
  const actual = await vi.importActual<typeof import('../../lib/groups')>('../../lib/groups')
  return {
    ...actual,
    updateGroupInviteSettings: (...args: unknown[]) => mockUpdateGroupInviteSettings(...args),
    fetchExamAssignments: (...args: unknown[]) => mockFetchExamAssignments(...args),
    createExamAssignment: (...args: unknown[]) => mockCreateExamAssignment(...args),
    deleteExamAssignment: (...args: unknown[]) => mockDeleteExamAssignment(...args),
  }
})

const mockFetchExams = vi.fn()
vi.mock('../../lib/exams', () => ({
  fetchExams: () => mockFetchExams(),
}))

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,MOCKQR'),
  },
}))

function renderAdminClasses() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AdminClasses />
    </QueryClientProvider>
  )
}

const sampleClasses = [
  {
    id: 'cls-1',
    name: 'Sat/Tue 5PM',
    grade: 7,
    teacher_id: 't-1',
    invite_code: 'G7-ABC123',
    invite_enabled: true,
    invite_expires_at: null,
    max_students: 25,
    schedule_note: 'Sat & Tue 5PM',
    created_at: '2026-11-20T00:00:00Z',
    profiles: { full_name: 'Mr. Moaaz', email: 'moaaz@example.com' },
  },
  {
    id: 'cls-2',
    name: 'Sun/Wed 7PM',
    grade: 9,
    teacher_id: null,
    invite_code: 'G9-XYZ789',
    invite_enabled: false,
    invite_expires_at: null,
    max_students: null,
    schedule_note: '',
    created_at: '2026-11-20T00:00:00Z',
    profiles: null,
  },
]

describe('AdminClasses — 3-Level Grade → Group → Student Drill-Down Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchClasses.mockResolvedValue(sampleClasses)
    mockFetchAvailableTeachers.mockResolvedValue([])
    mockFetchAvailableStudents.mockResolvedValue([
      { id: 'stu-2', full_name: 'Omar Ali', email: 'omar@example.com' },
    ])
    mockFetchExams.mockResolvedValue([
      { id: 'ex-1', title: 'Grade 7 Monthly Exam', type: 'exam', grade: 7 },
    ])
    mockFetchExamAssignments.mockResolvedValue([])
    mockFetchClassMembers.mockResolvedValue([
      {
        id: 'mem-1',
        class_id: 'cls-1',
        student_id: 'stu-1',
        profiles: { id: 'stu-1', full_name: 'Salma Hassan', email: 'salma@example.com' },
      },
    ])
    mockFetchStudentRecentAttempts.mockResolvedValue([
      {
        id: 'att-1',
        exam_id: 'ex-1',
        started_at: '2026-11-20T10:00:00Z',
        completed_at: '2026-11-20T10:20:00Z',
        score: 8,
        total_points: 10,
        status: 'completed',
        attempt_number: 1,
        exams: { id: 'ex-1', title: 'Grade 7 Monthly Exam', type: 'exam' },
      },
    ])
    mockUpdateGroupInviteSettings.mockResolvedValue(sampleClasses[0])
    mockMoveStudentToClass.mockResolvedValue(undefined)
    mockCreateExamAssignment.mockResolvedValue({ id: 'asg-1' })
    mockResetStudentAttempt.mockResolvedValue(undefined)
  })

  it('Level 1: filters groups by Grade 1–12 pills', async () => {
    renderAdminClasses()

    expect(await screen.findByText('Sat/Tue 5PM')).toBeInTheDocument()
    expect(screen.getByText('Sun/Wed 7PM')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'G7 (1)' }))

    expect(screen.getByText('Sat/Tue 5PM')).toBeInTheDocument()
    expect(screen.queryByText('Sun/Wed 7PM')).not.toBeInTheDocument()
  })

  it('Level 2: toggles invite lock and opens QR code modal', async () => {
    renderAdminClasses()

    await screen.findByText('Sat/Tue 5PM')

    fireEvent.click(screen.getByRole('button', { name: 'Lock Invite' }))
    await waitFor(() => {
      expect(mockUpdateGroupInviteSettings).toHaveBeenCalledWith('cls-1', { inviteEnabled: false })
    })

    const qrButtons = screen.getAllByRole('button', { name: 'QR Code' })
    fireEvent.click(qrButtons[0])

    expect(await screen.findByRole('dialog', { name: /QR Code for Sat\/Tue 5PM/i })).toBeInTheDocument()
    expect(screen.getByText('G7-ABC123')).toBeInTheDocument()
  })

  it('Level 3: expands group, moves student, inspects student, assigns exam, and resets attempt', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAdminClasses()

    await screen.findByText('Sat/Tue 5PM')

    const studentButtons = screen.getAllByRole('button', { name: 'Students' })
    fireEvent.click(studentButtons[0])

    expect(await screen.findByText('Salma Hassan')).toBeInTheDocument()

    // Move student to another group
    const moveSelect = screen.getByLabelText(/Move Salma Hassan to another group/i)
    fireEvent.change(moveSelect, { target: { value: 'cls-2' } })
    await waitFor(() => {
      expect(mockMoveStudentToClass).toHaveBeenCalledWith('cls-1', 'cls-2', 'stu-1')
    })

    // Inspect student modal
    fireEvent.click(screen.getByRole('button', { name: /Inspect & Assign/i }))
    expect(await screen.findByRole('dialog', { name: /Inspect student Salma Hassan/i })).toBeInTheDocument()

    // Assign targeted exam to single student
    const examSelect = screen.getByLabelText(/Select exam or sheet for student/i)
    fireEvent.change(examSelect, { target: { value: 'ex-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Assign to Student' }))
    await waitFor(() => {
      expect(mockCreateExamAssignment).toHaveBeenCalledWith({
        examId: 'ex-1',
        targetType: 'student',
        targetStudentId: 'stu-1',
      })
    })

    // Reset student attempt
    const resetBtn = await screen.findByRole('button', { name: 'Reset Attempt' })
    fireEvent.click(resetBtn)
    await waitFor(() => {
      expect(mockResetStudentAttempt).toHaveBeenCalledWith('att-1')
    })
  })
})
