import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar'

function renderWithRouter(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminSidebar />
    </MemoryRouter>
  )
}

describe('AdminSidebar', () => {
  it('renders all navigation links (desktop nav)', () => {
    renderWithRouter('/admin')
    const links = screen.getAllByText('Dashboard')
    expect(links.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
  })

  it('renders key navigation items', () => {
    renderWithRouter('/admin')
    expect(screen.getAllByText('Exams').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Users').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Questions').length).toBeGreaterThanOrEqual(1)
  })

  it('has a link to Question Analysis', () => {
    renderWithRouter('/admin')
    expect(screen.getAllByText('Question Analysis').length).toBeGreaterThanOrEqual(1)
  })
})
