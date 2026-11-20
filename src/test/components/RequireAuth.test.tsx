import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import RequireAuth from '../../components/RequireAuth'
import Layout from '../../components/Layout'
import { getSafeNextPath, extractInviteCodeFromNext } from '../../lib/safeRedirect'

let mockUser: Record<string, unknown> | null = null
let mockLoading = false

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: mockLoading,
    signOut: vi.fn(),
  }),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { grade: 9 }, error: null }),
    })),
  },
}))

function LocationEcho() {
  const loc = useLocation()
  return <div data-testid="login-echo">{loc.pathname}{loc.search}</div>
}

describe('Auth-Only Content Lock (RequireAuth + Layout + safeRedirect)', () => {
  beforeEach(() => {
    mockUser = null
    mockLoading = false
  })

  it('redirects unauthenticated visitors to /login?next=... and renders zero protected content', () => {
    render(
      <MemoryRouter initialEntries={['/exams?grade=9']}>
        <Routes>
          <Route path="/login" element={<LocationEcho />} />
          <Route
            path="/exams"
            element={
              <RequireAuth>
                <div>TOP SECRET EXAM CONTENT</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText('TOP SECRET EXAM CONTENT')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-echo').textContent).toBe('/login?next=%2Fexams%3Fgrade%3D9')
  })

  it('shows checking spinner and zero protected content while auth session is loading', () => {
    mockLoading = true
    render(
      <MemoryRouter initialEntries={['/sheets']}>
        <Routes>
          <Route
            path="/sheets"
            element={
              <RequireAuth>
                <div>PRIVATE PRACTICE SHEETS</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText('PRIVATE PRACTICE SHEETS')).not.toBeInTheDocument()
    expect(screen.getByText(/Checking your session/i)).toBeInTheDocument()
  })

  it('renders protected content for authenticated users', () => {
    mockUser = { id: 'stu-1', email: 'student@example.com' }
    render(
      <MemoryRouter initialEntries={['/sheets']}>
        <Routes>
          <Route
            path="/sheets"
            element={
              <RequireAuth>
                <div>PRIVATE PRACTICE SHEETS</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('PRIVATE PRACTICE SHEETS')).toBeInTheDocument()
  })

  it('hides Sheets, Exams, Dashboard, and Grapher nav links in Layout when signed out', () => {
    mockUser = null
    render(
      <MemoryRouter>
        <Layout><div>Landing</div></Layout>
      </MemoryRouter>
    )

    expect(screen.queryByRole('link', { name: 'Sheets' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Exams' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Grapher' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument()
  })

  it('shows content nav links in Layout when signed in', () => {
    mockUser = { id: 'stu-1', email: 'student@example.com', user_metadata: { full_name: 'Omar Ali' } }
    render(
      <MemoryRouter>
        <Layout><div>Inside</div></Layout>
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: 'Sheets' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Exams' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Grapher' })).toBeInTheDocument()
  })

  it('validates safe relative redirects and blocks open redirects', () => {
    expect(getSafeNextPath('/sheets')).toBe('/sheets')
    expect(getSafeNextPath('/join/G7-ABC123')).toBe('/join/G7-ABC123')
    expect(getSafeNextPath('//evil.com')).toBe('/exams')
    expect(getSafeNextPath('https://evil.com/steal')).toBe('/exams')
    expect(getSafeNextPath('/\\evil.com')).toBe('/exams')
    expect(getSafeNextPath('')).toBe('/exams')
    expect(extractInviteCodeFromNext('/join/g7-abc123')).toBe('G7-ABC123')
    expect(extractInviteCodeFromNext('/exams')).toBeNull()
  })
})
