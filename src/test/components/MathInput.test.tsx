import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import 'mathlive'
import MathInput from '../../components/MathInput'

describe('MathInput Component with Visual Calculator Boxes', () => {
  it('renders visual calculator editor with format buttons and answer input', () => {
    const handleChange = vi.fn()
    render(<MathInput value="" onChange={handleChange} />)

    // Visual editor region
    expect(screen.getByRole('region', { name: /Visual Math Editor/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Type your answer/i)).toBeInTheDocument()

    // Fraction button switches to numerator and denominator boxes
    const fracBtn = screen.getByRole('button', { name: /Format as Fraction/i })
    fireEvent.click(fracBtn)
    expect(screen.getByPlaceholderText(/Numerator/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Denominator/i)).toBeInTheDocument()
  })

  it('updates answer when student types numbers into numerator and denominator boxes', () => {
    const handleChange = vi.fn()
    render(<MathInput value="3/4" onChange={handleChange} />)

    const numInput = screen.getByPlaceholderText(/Numerator/i)
    fireEvent.change(numInput, { target: { value: '5' } })
    expect(handleChange).toHaveBeenCalledWith('5/4')

    const denInput = screen.getByPlaceholderText(/Denominator/i)
    fireEvent.change(denInput, { target: { value: '8' } })
    expect(handleChange).toHaveBeenCalledWith('5/8')
  })

  it('switches to Power format with base and exponent boxes', () => {
    const handleChange = vi.fn()
    render(<MathInput value="" onChange={handleChange} />)

    const powerBtn = screen.getByRole('button', { name: /Format as Power/i })
    fireEvent.click(powerBtn)

    expect(screen.getByLabelText('Base')).toBeInTheDocument()
    expect(screen.getByLabelText('Exponent')).toBeInTheDocument()

    const expInput = screen.getByLabelText('Exponent')
    fireEvent.change(expInput, { target: { value: '2' } })
    expect(handleChange).toHaveBeenCalledWith('x^{2}')
  })

  it('switches to Root format with radicand box', () => {
    const handleChange = vi.fn()
    render(<MathInput value="" onChange={handleChange} />)

    const rootBtn = screen.getByRole('button', { name: /Format as Root/i })
    fireEvent.click(rootBtn)

    const radInput = screen.getByPlaceholderText(/Inside root/i)
    fireEvent.change(radInput, { target: { value: '25' } })
    expect(handleChange).toHaveBeenCalledWith('\\sqrt{25}')
  })

  it('switches to Limit format with approaches and expression boxes', () => {
    const handleChange = vi.fn()
    render(<MathInput value="" onChange={handleChange} />)

    const limBtn = screen.getByRole('button', { name: /Format as Limit/i })
    fireEvent.click(limBtn)

    expect(screen.getByPlaceholderText(/f\(x\)/i)).toBeInTheDocument()
    const exprInput = screen.getByPlaceholderText(/f\(x\)/i)
    fireEvent.change(exprInput, { target: { value: '2x' } })
    expect(handleChange).toHaveBeenCalledWith('\\lim_{x \\to 0} 2x')
  })

  it('toggles keypad visibility', () => {
    render(<MathInput value="" onChange={vi.fn()} />)

    expect(screen.getByRole('region', { name: /Math Keypad/i })).toBeInTheDocument()

    const toggleBtn = screen.getByRole('button', { name: /Hide Keypad/i })
    fireEvent.click(toggleBtn)

    expect(screen.queryByRole('region', { name: /Math Keypad/i })).not.toBeInTheDocument()
  })

  it('switches to plain input mode', () => {
    const handleChange = vi.fn()
    render(<MathInput value="x + 5" onChange={handleChange} placeholder="Type your answer..." />)

    const plainBtn = screen.getByRole('button', { name: /Plain Input/i })
    fireEvent.click(plainBtn)

    const input = screen.getByPlaceholderText('Type your answer...')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('x + 5')
  })
})
