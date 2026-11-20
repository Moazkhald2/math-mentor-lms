import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../../components/Layout'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signOut: vi.fn(),
  }),
}))

describe('Layout copyright footer', () => {
  it('renders clean brand copyright notice without encoding corruption', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Content</div>
        </Layout>
      </MemoryRouter>
    )

    const year = new Date().getFullYear()
    const footer = screen.getByRole('contentinfo')
    expect(footer.textContent).toContain(`© ${year} Moaaz Khaled — The Math Mentor. All Rights Reserved.`)
    expect(footer.textContent).not.toContain('\uFFFD')
  })
})
