import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ForgotPassword, { formatAuthEmailError } from '../../pages/ForgotPassword'
import Register from '../../pages/Register'

const mockResetPassword = vi.fn()
const mockResend = vi.fn()
const mockSignUp = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: any[]) => mockResetPassword(...args),
      resend: (...args: any[]) => mockResend(...args),
    },
  },
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signUp: (...args: any[]) => mockSignUp(...args),
  }),
}))

describe('Auth email resend cooldown & rate-limit feedback (Step 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formats Supabase rate-limit errors into a clear student-friendly wait message', () => {
    const friendly = formatAuthEmailError('Email rate limit exceeded (429)')
    expect(friendly).toMatch(/wait 60 seconds/i)
    expect(friendly).toMatch(/Spam\/Junk/i)
    expect(formatAuthEmailError('Invalid email')).toBe('Invalid email')
  })

  it('enforces 60-second resend cooldown after sending a password reset link', async () => {
    mockResetPassword.mockResolvedValueOnce({ error: null })

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    )

    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'student@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /Send Reset Link/i }))

    const resendBtn = await screen.findByRole('button', { name: /Resend link in 60s/i })
    expect(resendBtn).toBeDisabled()
  })

  it('renders Register with clean UTF-8 copy and shows 60s confirmation resend cooldown on success', async () => {
    mockSignUp.mockResolvedValueOnce(null)

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    expect(document.body.textContent).not.toContain('\uFFFD')

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Ahmed' } })
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Hassan' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'ahmed@gmail.com' } })
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Math1234' } })
    fireEvent.click(screen.getByRole('button', { name: '10' }))
    fireEvent.change(screen.getByLabelText(/Guardian Full Name/i), { target: { value: 'Hassan Ali' } })
    fireEvent.change(screen.getByLabelText(/Guardian Email/i), { target: { value: 'hassan@gmail.com' } })
    fireEvent.change(screen.getByLabelText(/Parent Phone/i), { target: { value: '+201012345678' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Resend confirmation in 60s/i })
      expect(btn).toBeDisabled()
    })
  })
})
