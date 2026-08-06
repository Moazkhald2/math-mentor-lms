import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Watermark from '../../components/Watermark'

describe('Watermark', () => {
  it('renders the student label in a corner', () => {
    render(<Watermark label="Moaz Khaled" />)
    const items = screen.getAllByText(/Moaz Khaled/)
    expect(items).toHaveLength(1)
  })
  it('is fixed to a screen corner (not rotated, not full-screen)', () => {
    const { container } = render(<Watermark label="ABC" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('pointer-events-none')
    expect(root.className).toContain('fixed')
    expect(root.className).not.toContain('inset-0')
  })
})