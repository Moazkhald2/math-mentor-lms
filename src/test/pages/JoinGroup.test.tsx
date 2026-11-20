import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import JoinGroup from '../../pages/JoinGroup'
import Register from '../../pages/Register'
import { PENDING_INVITE_STORAGE_KEY } from '../../lib/groups'

let mockUser: Record<string, unknown> | null = null
let mockLoading = false
const mockSignUp = vi.fn()
const mockPreview = vi.fn()
const mockRedeem = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: mockLoading,
    signUp: (...args: any[]) => mockSignUp(...args),
  }),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      resend: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

vi.mock('../../lib/groups', async () => {
  const actual = await vi.importActual<typeof import('../../lib/groups')>('../../lib/groups')
  return {
    ...actual,
    previewGroupInvite: (...args: any[]) => mockPreview(...args),
    redeemGroupInvite: (...args: any[]) => mockRedeem(...args),
  }
})

function renderJoin(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/join/:code" element={<JoinGroup />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Step 8 — Student Join-by-Link Flow (/join/:code & /register?invite=)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockUser = null
    mockLoading = false
  })

  it('shows group preview and Sign Up / Sign In options for unauthenticated invitees', async () => {
    mockPreview.mockResolvedValueOnce({
      valid: true,
      group_id: 'grp-1',
      group_name: 'Sat/Tue 5PM',
      grade: 7,
      schedule_note: 'Saturday & Tuesday 5:00 PM',
      spots_left: 4,
    })

    renderJoin('/join/g7-abc12345')

    expect(await screen.findByRole('heading', { name: 'Sat/Tue 5PM' })).toBeInTheDocument()
    expect(screen.getByText(/Grade 7 Group Invite/i)).toBeInTheDocument()
    expect(screen.getByText(/Saturday & Tuesday 5:00 PM/i)).toBeInTheDocument()
    expect(screen.getByText(/4 spots remaining/i)).toBeInTheDocument()

    const registerBtn = screen.getByRole('link', { name: /Create Student Account & Join/i })
    expect(registerBtn).toHaveAttribute('href', '/register?invite=G7-ABC12345')

    const loginBtn = screen.getByRole('link', { name: /Sign In/i })
    expect(loginBtn).toHaveAttribute('href', '/login?next=%2Fjoin%2FG7-ABC12345')
  })

  it('lets a signed-in student join in 1 click and shows welcome confirmation', async () => {
    mockUser = { id: 'stu-1', email: 'salma@example.com', user_metadata: { full_name: 'Salma Tarek' } }
    mockPreview.mockResolvedValueOnce({
      valid: true,
      group_id: 'grp-1',
      group_name: 'Sun/Wed 6PM',
      grade: 8,
      schedule_note: 'Sunday & Wednesday 6:00 PM',
      spots_left: 10,
    })
    mockRedeem.mockResolvedValueOnce({
      joined: true,
      already_member: false,
      group_id: 'grp-1',
      group_name: 'Sun/Wed 6PM',
      grade: 8,
    })

    renderJoin('/join/G8-TEST9999')

    const joinBtn = await screen.findByRole('button', { name: /Join Grade 8 — Sun\/Wed 6PM/i })
    fireEvent.click(joinBtn)

    await waitFor(() => {
      expect(mockRedeem).toHaveBeenCalledWith('G8-TEST9999')
    })
    expect(await screen.findByText(/Welcome to Your Group!/i)).toBeInTheDocument()
    expect(localStorage.getItem('math_mentor_current_grade')).toBe('8')
  })

  it('displays clear status cards for locked, expired, and full invite links', async () => {
    mockPreview.mockResolvedValueOnce({ valid: false, reason: 'invalid_or_disabled' })
    const { unmount } = renderJoin('/join/G7-LOCKED')
    expect(await screen.findByText(/Invite Link Unavailable/i)).toBeInTheDocument()
    unmount()

    mockPreview.mockResolvedValueOnce({ valid: false, reason: 'expired' })
    const second = renderJoin('/join/G7-EXPIRED')
    expect(await screen.findByText(/Invite Link Expired/i)).toBeInTheDocument()
    second.unmount()

    mockPreview.mockResolvedValueOnce({ valid: false, reason: 'group_full', group_name: 'Mon 4PM', grade: 9 })
    renderJoin('/join/G9-FULL')
    expect(await screen.findByText(/This Group Is Full/i)).toBeInTheDocument()
    expect(screen.getByText(/Grade 9 — Mon 4PM/i)).toBeInTheDocument()
  })

  it('pre-selects and locks Grade on /register?invite=... and stores pending invite on sign-up', async () => {
    mockPreview.mockResolvedValueOnce({
      valid: true,
      group_id: 'grp-2',
      group_name: 'Thu 7PM Elite',
      grade: 11,
      schedule_note: 'Thursday 7:00 PM',
      spots_left: 3,
    })
    mockSignUp.mockResolvedValueOnce(null)

    render(
      <MemoryRouter initialEntries={['/register?invite=G11-ELITE01']}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText(/Joining Grade 11 — Thu 7PM Elite/i)).toBeInTheDocument()
    expect(screen.getByText(/Grade \(Assigned by Group Invite\)/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Youssef' } })
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Adel' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'youssef@gmail.com' } })
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Math2026' } })
    fireEvent.change(screen.getByLabelText(/Guardian Full Name/i), { target: { value: 'Adel Mahmoud' } })
    fireEvent.change(screen.getByLabelText(/Guardian Email/i), { target: { value: 'adel@gmail.com' } })
    fireEvent.change(screen.getByLabelText(/Parent Phone/i), { target: { value: '+201099887766' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /Create Account & Join Group/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        'youssef@gmail.com',
        'Math2026',
        'Youssef Adel',
        11,
        '+201099887766',
        expect.objectContaining({
          ageBand: 'under_18',
          guardianName: 'Adel Mahmoud',
          guardianEmail: 'adel@gmail.com',
          consentVersion: '2026-11-v1',
        })
      )
    })
    expect(localStorage.getItem(PENDING_INVITE_STORAGE_KEY)).toBe('G11-ELITE01')
    const backToLogin = await screen.findByRole('link', { name: /Back to Sign In/i })
    expect(backToLogin).toHaveAttribute('href', '/login?next=%2Fjoin%2FG11-ELITE01')
  })
})
