import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../../pages/Login'

// ---- Router mocks ----
const mockNavigate = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, vi.fn()],
}))

// ---- Auth mocks ----
let mockUser: Record<string, unknown> | null = null
let mockLoading = false
const mockSignIn = vi.fn()
const mockSignInWithGoogle = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: mockLoading,
    signIn: mockSignIn,
    signInWithGoogle: mockSignInWithGoogle,
    signUp: vi.fn(),
    signOut: vi.fn(),
    loginCooldown: 0,
  }),
}))

// ---- Toast mock ----
const mockToast = vi.fn()

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = null
    mockLoading = false
    mockSearchParams.delete('reset')
  })

  it('renders login form with email/password inputs and submit button', () => {
    render(<Login />)
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('shows error message on failed login', async () => {
    mockSignIn.mockResolvedValue('Invalid credentials')
    render(<Login />)

    const user = userEvent.setup()
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement

    await user.type(emailInput, 'test@test.com')
    await user.type(passwordInput, 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('shows submitting state during login', async () => {
    mockSignIn.mockReturnValue(new Promise<string | null>(() => {})) // never resolves
    render(<Login />)

    const user = userEvent.setup()
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement

    await user.type(emailInput, 'test@test.com')
    await user.type(passwordInput, 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(screen.getByText('Signing in...')).toBeInTheDocument()
  })

  it('redirects when already authenticated', () => {
    mockUser = { id: 'user-1', email: 'test@test.com' }
    render(<Login />)
    expect(mockNavigate).toHaveBeenCalledWith('/exams', { replace: true })
  })

  it('shows Google OAuth button', () => {
    render(<Login />)
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
  })

  it('has link to register page', () => {
    render(<Login />)
    const link = screen.getByText('Sign up')
    expect(link.closest('a')).toHaveAttribute('href', '/register')
  })

  it('has link to forgot password', () => {
    render(<Login />)
    const link = screen.getByText('Forgot password?')
    expect(link.closest('a')).toHaveAttribute('href', '/forgot-password')
  })
})
