import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPolicy from '../../pages/PrivacyPolicy'
import TermsOfService from '../../pages/TermsOfService'
import Register from '../../pages/Register'
import { CONSENT_POLICY_VERSION, LEGAL_CONTACT_EMAIL } from '../../lib/legal'

const mockSignUp = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
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

describe('Pre-Onboarding Legal & Guardian Consent Gate (Egyptian Law No. 151/2020)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Arabic-first RTL Privacy Notice by default and toggles to English Summary', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /إشعار الخصوصية وحماية البيانات الشخصية/ })).toBeInTheDocument()
    expect(screen.getByText(/قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020/)).toBeInTheDocument()
    expect(screen.getAllByText(LEGAL_CONTACT_EMAIL).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /English Summary/i }))
    expect(screen.getByRole('heading', { name: /Privacy Notice & Personal Data Protection/i })).toBeInTheDocument()
    expect(screen.getByText(/Egyptian Law No\. 151\/2020/i)).toBeInTheDocument()
  })

  it('renders Arabic-first Terms of Service and toggles to English Summary', () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /شروط الاستخدام/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /English Summary/i }))
    expect(screen.getByRole('heading', { name: /Terms of Service/i })).toBeInTheDocument()
  })

  it('blocks under-18 registration when guardian consent checkbox is unchecked', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Omar' } })
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Tarek' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'omar@gmail.com' } })
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Math2026' } })
    fireEvent.click(screen.getByRole('button', { name: '4' }))
    fireEvent.change(screen.getByLabelText(/Guardian Full Name/i), { target: { value: 'Tarek Mohamed' } })
    fireEvent.change(screen.getByLabelText(/Guardian Email/i), { target: { value: 'omar@gmail.com' } })
    fireEvent.change(screen.getByLabelText(/Parent Phone/i), { target: { value: '+201012345678' } })

    // Submit without ticking consent
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))
    expect(await screen.findByText(/Legal guardian consent is required/i)).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()

    // Now tick consent — same parent email for Grade 4 is allowed
    mockSignUp.mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        'omar@gmail.com',
        'Math2026',
        'Omar Tarek',
        4,
        '+201012345678',
        expect.objectContaining({
          ageBand: 'under_18',
          guardianName: 'Tarek Mohamed',
          guardianEmail: 'omar@gmail.com',
          consentVersion: CONSENT_POLICY_VERSION,
        })
      )
    })
  })

  it('allows 18+ students to register without guardian fields while still requiring Privacy/Terms consent', async () => {
    mockSignUp.mockResolvedValueOnce(null)

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Nour' } })
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Samir' } })
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'nour@gmail.com' } })
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Math2026' } })
    fireEvent.click(screen.getByRole('button', { name: '12' }))

    // Switch to 18 or older
    fireEvent.click(screen.getByRole('button', { name: /18 or older/i }))
    expect(screen.queryByLabelText(/Guardian Full Name/i)).not.toBeInTheDocument()

    // Still requires consent checkbox
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))
    expect(await screen.findByText(/Privacy Notice and Terms of Service/i)).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        'nour@gmail.com',
        'Math2026',
        'Nour Samir',
        12,
        '',
        expect.objectContaining({
          ageBand: 'adult_18_plus',
          guardianName: '',
          guardianEmail: '',
          consentVersion: CONSENT_POLICY_VERSION,
        })
      )
    })
  })
})
