import { describe, it, expect } from 'vitest'
import { parseMathTemplate, formatMathTemplate, type TemplateState } from '../../lib/mathTemplates'

describe('parseMathTemplate', () => {
  it('parses latex and simple slash fractions into fraction template', () => {
    const f1 = parseMathTemplate('\\frac{3}{4}')
    expect(f1.template).toBe('fraction')
    expect(f1.num).toBe('3')
    expect(f1.den).toBe('4')

    const f2 = parseMathTemplate('5/8')
    expect(f2.template).toBe('fraction')
    expect(f2.num).toBe('5')
    expect(f2.den).toBe('8')
  })

  it('parses powers and exponents', () => {
    const p1 = parseMathTemplate('x^2')
    expect(p1.template).toBe('power')
    expect(p1.base).toBe('x')
    expect(p1.exp).toBe('2')

    const p2 = parseMathTemplate('y^{n+1}')
    expect(p2.template).toBe('power')
    expect(p2.base).toBe('y')
    expect(p2.exp).toBe('n+1')
  })

  it('parses square roots', () => {
    const r1 = parseMathTemplate('\\sqrt{25}')
    expect(r1.template).toBe('root')
    expect(r1.radicand).toBe('25')

    const r2 = parseMathTemplate('sqrt(2x+1)')
    expect(r2.template).toBe('root')
    expect(r2.radicand).toBe('2x+1')
  })

  it('parses limits', () => {
    const l1 = parseMathTemplate('\\lim_{x \\to 0} 3x')
    expect(l1.template).toBe('limit')
    expect(l1.approaches).toBe('0')
    expect(l1.expr).toBe('3x')
  })

  it('defaults to expression for general expressions', () => {
    const e1 = parseMathTemplate('x = 42')
    expect(e1.template).toBe('expression')
    expect(e1.raw).toBe('x = 42')
  })
})

describe('formatMathTemplate', () => {
  it('formats fractions accurately', () => {
    const state: TemplateState = {
      template: 'fraction',
      num: '3',
      den: '4',
      base: 'x',
      exp: '',
      radicand: '',
      approaches: '0',
      expr: '',
      raw: '',
    }
    expect(formatMathTemplate(state)).toBe('3/4')

    state.num = 'x + 1'
    state.den = 'x - 1'
    expect(formatMathTemplate(state)).toBe('\\frac{x + 1}{x - 1}')
  })

  it('formats powers, roots, and limits', () => {
    const pState: TemplateState = {
      template: 'power',
      num: '',
      den: '',
      base: 'x',
      exp: '3',
      radicand: '',
      approaches: '0',
      expr: '',
      raw: '',
    }
    expect(formatMathTemplate(pState)).toBe('x^{3}')

    const rState: TemplateState = {
      template: 'root',
      num: '',
      den: '',
      base: 'x',
      exp: '',
      radicand: '16',
      approaches: '0',
      expr: '',
      raw: '',
    }
    expect(formatMathTemplate(rState)).toBe('\\sqrt{16}')

    const lState: TemplateState = {
      template: 'limit',
      num: '',
      den: '',
      base: 'x',
      exp: '',
      radicand: '',
      approaches: '0',
      expr: 'x^2 - 1',
      raw: '',
    }
    expect(formatMathTemplate(lState)).toBe('\\lim_{x \\to 0} x^2 - 1')
  })
})
