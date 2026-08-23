import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Watermark from '../../components/Watermark'

describe('Watermark', () => {
  it('renders the student label in a corner plus tiled anti-cheat', () => {
    render(<Watermark label="Moaz Khaled" />)
    const items = screen.getAllByText(/Moaz Khaled/)
    expect(items.length).toBeGreaterThanOrEqual(1)
    expect(items[0].textContent).toContain('Moaz Khaled')
  })
  it('is fixed to a screen corner (not rotated, not full-screen)', () => {
    const { container } = render(<Watermark label="ABC" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('pointer-events-none')
    expect(root.className).toContain('fixed')
  })
})