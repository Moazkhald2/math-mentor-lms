import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import AntiCheatGuard from '../../components/AntiCheatGuard'

const mockUseAntiCheat = vi.fn()

vi.mock('../../hooks/useAntiCheat', () => ({
  useAntiCheat: (...args: unknown[]) => mockUseAntiCheat(...args),
}))

function mockAntiCheat(overrides: Record<string, unknown> = {}) {
  mockUseAntiCheat.mockReturnValue({
    warningCount: 0,
    isDisqualified: false,
    timeSpent: 0,
    isFullscreen: true,
    requestFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),
    violations: [],
    ...overrides,
  })
}

describe('AntiCheatGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAntiCheat()
  })

  it('renders children when not disqualified', () => {
    render(
      <AntiCheatGuard examId="exam-1">
        <div>Test content</div>
      </AntiCheatGuard>,
    )
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('shows disqualification screen when violations exceed maxWarnings', () => {
    mockAntiCheat({ isDisqualified: true })
    render(
      <AntiCheatGuard examId="exam-1">
        <div>Test content</div>
      </AntiCheatGuard>,
    )
    expect(screen.getByText('Exam Disqualified')).toBeInTheDocument()
    expect(screen.queryByText('Test content')).not.toBeInTheDocument()
  })

  it('shows fullscreen warning when not in fullscreen mode', () => {
    mockAntiCheat({ isFullscreen: false })
    render(
      <AntiCheatGuard examId="exam-1">
        <div>content</div>
      </AntiCheatGuard>,
    )
    expect(screen.getByText(/Click fullscreen to start/)).toBeInTheDocument()
  })

  it('shows violation counter when warnings exist', () => {
    mockAntiCheat({ warningCount: 2 })
    render(
      <AntiCheatGuard examId="exam-1" maxWarnings={5}>
        <div>content</div>
      </AntiCheatGuard>,
    )
    expect(screen.getByText(/Violations: 2\/5/)).toBeInTheDocument()
  })

  it('shows timer when durationMinutes is set', () => {
    mockAntiCheat({ timeSpent: 60 })
    render(
      <AntiCheatGuard examId="exam-1" durationMinutes={10}>
        <div>content</div>
      </AntiCheatGuard>,
    )
    // 10*60 - 60 = 540 -> 9:00
    expect(screen.getByText(/9:00/)).toBeInTheDocument()
  })

  it('shows low-time warning when under 5 minutes', () => {
    mockAntiCheat({ timeSpent: 7 * 60 }) // 7 min spent of 10 -> 3 min remaining
    render(
      <AntiCheatGuard examId="exam-1" durationMinutes={10}>
        <div>content</div>
      </AntiCheatGuard>,
    )
    expect(screen.getByText('Time left')).toBeInTheDocument()
    expect(screen.getByText('3:00')).toBeInTheDocument()
  })

  it('calls onTimeUp when time exceeds duration', async () => {
    mockAntiCheat({ timeSpent: 10 * 60 + 1 }) // over 10 min
    const onTimeUp = vi.fn()
    render(
      <AntiCheatGuard examId="exam-1" durationMinutes={10} onTimeUp={onTimeUp}>
        <div>content</div>
      </AntiCheatGuard>,
    )
    await waitFor(() => {
      expect(onTimeUp).toHaveBeenCalled()
    })
  })

  it('passes onViolation callback to useAntiCheat', () => {
    const onViolation = vi.fn()
    render(
      <AntiCheatGuard examId="exam-1" onViolation={onViolation}>
        <div>content</div>
      </AntiCheatGuard>,
    )
    expect(mockUseAntiCheat).toHaveBeenCalledWith(
      expect.objectContaining({ onViolation }),
    )
  })
})
