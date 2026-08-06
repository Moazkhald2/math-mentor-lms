import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Watermark from '../../components/Watermark'

describe('Watermark', () => {
  it('renders the student label', () => {
    render(<Watermark label="Moaz Khaled — Grade 10" />)
    expect(screen.getAllByText(/Moaz Khaled/).length).toBeGreaterThan(0)
  })
  it('is decorative and pointer-transparent', () => {
    const { container } = render(<Watermark label="ABC" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('pointer-events-none')
  })
})