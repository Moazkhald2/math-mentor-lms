import { describe, it, expect } from 'vitest'
import { normalizeMathAnswer, isMathAnswerEqual } from '../../lib/mathNormalize'

describe('normalizeMathAnswer', () => {
  it('converts unicode superscripts to standard caret notation', () => {
    expect(normalizeMathAnswer('x²')).toBe('x^2')
    expect(normalizeMathAnswer('3x³ + 2x² - 5')).toBe('3x^3+2x^2-5')
    expect(normalizeMathAnswer('y⁻¹')).toBe('y^-1')
  })

  it('converts latex fractions into standard slash notation', () => {
    expect(normalizeMathAnswer('\\frac{1}{2}')).toBe('(1)/(2)')
    expect(normalizeMathAnswer('\\dfrac{3x + 1}{4}')).toBe('(3x+1)/(4)')
  })

  it('handles square roots and symbols', () => {
    expect(normalizeMathAnswer('\\sqrt{25}')).toBe('sqrt(25)')
    expect(normalizeMathAnswer('\\pm 5')).toBe('+-5')
    expect(normalizeMathAnswer('3 × 4 ÷ 2')).toBe('3*4/2')
  })

  it('normalizes limits and infinity', () => {
    expect(normalizeMathAnswer('\\lim_{x \\to 0}')).toBe('lim(x->0)')
    expect(normalizeMathAnswer('\\infty')).toBe('inf')
  })

  it('removes math dollar wraps', () => {
    expect(normalizeMathAnswer('$x^2 + 1$')).toBe('x^2+1')
    expect(normalizeMathAnswer('$$y = mx + b$$')).toBe('y=mx+b')
  })
})

describe('isMathAnswerEqual', () => {
  it('matches exact and case-insensitive strings', () => {
    expect(isMathAnswerEqual('apple', 'apple')).toBe(true)
    expect(isMathAnswerEqual('x = 5', 'X = 5')).toBe(true)
  })

  it('matches latex fraction to ascii fraction', () => {
    expect(isMathAnswerEqual('\\frac{3}{4}', '3/4')).toBe(true)
    expect(isMathAnswerEqual('(3)/(4)', '3/4')).toBe(true)
  })

  it('matches numerical fraction to decimal equivalent', () => {
    expect(isMathAnswerEqual('1/2', '0.5')).toBe(true)
    expect(isMathAnswerEqual('\\frac{1}{2}', '0.5')).toBe(true)
    expect(isMathAnswerEqual('0.75', '\\frac{3}{4}')).toBe(true)
    expect(isMathAnswerEqual('-1/4', '-0.25')).toBe(true)
  })

  it('matches expressions with different spacing or unicode powers', () => {
    expect(isMathAnswerEqual('x^2 + 2x + 1', 'x²+2x+1')).toBe(true)
    expect(isMathAnswerEqual('x \\to 0', 'x->0')).toBe(true)
    expect(isMathAnswerEqual('\\pm 4', '+-4')).toBe(true)
  })

  it('rejects incorrect answers', () => {
    expect(isMathAnswerEqual('1/2', '1/3')).toBe(false)
    expect(isMathAnswerEqual('x^2', 'x^3')).toBe(false)
    expect(isMathAnswerEqual(null, '5')).toBe(false)
  })
})
