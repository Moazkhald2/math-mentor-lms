import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
  it('renders all 4 streamlined navigation sections', () => {
    renderWithRouter('/admin')
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
    expect(screen.getByText('Overview & Schedule')).toBeInTheDocument()
    expect(screen.getByText('Grades, Groups & Students')).toBeInTheDocument()
    expect(screen.getByText('Content & Assessments')).toBeInTheDocument()
    expect(screen.getByText('Analytics & Safety')).toBeInTheDocument()
  })

  it('renders key navigation items', () => {
    renderWithRouter('/admin')
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Grades & Groups').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Exams').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Users').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Questions').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Question Analysis').length).toBeGreaterThanOrEqual(1)
  })

  it('toggles collapsible mobile drawer cleanly', () => {
    renderWithRouter('/admin/classes')
    const menuBtn = screen.getByRole('button', { name: /Admin · Grades & Groups/i })
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(menuBtn)
    expect(menuBtn).toHaveAttribute('aria-expanded', 'true')
  })
})
