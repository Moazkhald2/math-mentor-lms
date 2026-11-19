import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MathInput from '../../components/MathInput'

describe('MathInput Component', () => {
  it('renders input with default placeholder and quick math keys', () => {
    const handleChange = vi.fn()
    render(<MathInput value="" onChange={handleChange} />)

    expect(screen.getByPlaceholderText(/Type your answer/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Insert a\/b/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Insert x²/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Insert lim/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Insert ∞/i })).toBeInTheDocument()
  })

  it('calls onChange when user types directly into input', () => {
    const handleChange = vi.fn()
    render(<MathInput value="" onChange={handleChange} />)

    const input = screen.getByPlaceholderText(/Type your answer/i)
    fireEvent.change(input, { target: { value: 'x + 5' } })

    expect(handleChange).toHaveBeenCalledWith('x + 5')
  })

  it('inserts power ^2 when clicking x² quick key', () => {
    const handleChange = vi.fn()
    render(<MathInput value="x" onChange={handleChange} />)

    const btn = screen.getByRole('button', { name: /Insert x²/i })
    fireEvent.click(btn)

    expect(handleChange).toHaveBeenCalledWith('x^2')
  })

  it('inserts fraction template when clicking a/b', () => {
    const handleChange = vi.fn()
    render(<MathInput value="" onChange={handleChange} />)

    const btn = screen.getByRole('button', { name: /Insert a\/b/i })
    fireEvent.click(btn)

    expect(handleChange).toHaveBeenCalledWith('\\frac{}{}')
  })

  it('toggles full calculator drawer open and closed', () => {
    const handleChange = vi.fn()
    render(<MathInput value="" onChange={handleChange} />)

    const toggleBtn = screen.getByRole('button', { name: /More Keys/i })
    fireEvent.click(toggleBtn)

    // Full keypad region should now be visible
    expect(screen.getByRole('region', { name: /Math Keypad/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Algebra & Powers/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Calculus & Limits/i })).toBeInTheDocument()

    // Toggle closed
    const closeBtn = screen.getByRole('button', { name: /Close Keypad/i })
    fireEvent.click(closeBtn)

    expect(screen.queryByRole('region', { name: /Math Keypad/i })).not.toBeInTheDocument()
  })

  it('displays real-time preview when value is present', () => {
    render(<MathInput value="3/4" onChange={vi.fn()} />)

    expect(screen.getByText(/Preview:/i)).toBeInTheDocument()
  })
})
