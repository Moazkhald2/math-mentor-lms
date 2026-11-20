import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Watermark from '../../components/Watermark'

describe('Watermark', () => {
  it('renders the student real name, email sublabel, and timestamp across the overlay', () => {
    render(<Watermark label="Moaaz Khaled" sublabel="moaaz@example.com" />)
    const items = screen.getAllByText(/Moaaz Khaled \(moaaz@example\.com\)/)
    expect(items.length).toBeGreaterThanOrEqual(1)
    expect(items[0].textContent).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)
  })

  it('uses a non-interactive fixed pointer-events-none overlay', () => {
    const { container } = render(<Watermark label="ABC" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('pointer-events-none')
    expect(root.className).toContain('fixed')
    expect(root.className).toContain('select-none')
  })
})
