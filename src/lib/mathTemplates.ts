/**
 * Visual Math Template Parser and Serializer
 * Converts between structured visual calculator states and standard math/LaTeX strings.
 */

export type TemplateType = 'fraction' | 'power' | 'root' | 'limit' | 'expression'

export interface TemplateState {
  template: TemplateType
  num: string
  den: string
  base: string
  exp: string
  radicand: string
  approaches: string
  expr: string
  raw: string
}

export const INITIAL_TEMPLATE_STATE: TemplateState = {
  template: 'expression',
  num: '',
  den: '',
  base: 'x',
  exp: '',
  radicand: '',
  approaches: '0',
  expr: '',
  raw: '',
}

/**
 * Parses an incoming math string into an interactive template state
 */
export function parseMathTemplate(val: string | null | undefined): TemplateState {
  const state: TemplateState = { ...INITIAL_TEMPLATE_STATE }
  if (!val || !val.trim()) {
    return state
  }

  const s = val.trim()

  // 1. Limit: \lim_{x \to 0} expr or lim(x->0) expr
  const limMatch = s.match(/^(?:\\lim_\{x\s*(?:\\to|->)\s*([^}]+)\}|lim\s*\(\s*x\s*->\s*([^)]+)\))\s*(.*)$/i)
  if (limMatch) {
    state.template = 'limit'
    state.approaches = (limMatch[1] || limMatch[2] || '0').trim()
    state.expr = (limMatch[3] || '').trim()
    return state
  }

  // 2. Square Root: \sqrt{radicand} or sqrt(radicand) or √radicand
  const rootMatch = s.match(/^(?:\\sqrt\{([^}]+)\}|sqrt\(([^)]+)\)|√\s*([a-zA-Z0-9.]+))$/i)
  if (rootMatch) {
    state.template = 'root'
    state.radicand = (rootMatch[1] || rootMatch[2] || rootMatch[3] || '').trim()
    return state
  }

  // 3. Fraction: \frac{A}{B} or \dfrac{A}{B} or A/B
  const fracMatch = s.match(/^(?:\\(?:d)?frac\{([^}]+)\}\{([^}]+)\}|\(?([a-zA-Z0-9.\s+*-]+)\)?\s*\/\s*\(?([a-zA-Z0-9.\s+*-]+)\)?)$/)
  if (fracMatch) {
    state.template = 'fraction'
    state.num = (fracMatch[1] || fracMatch[3] || '').trim()
    state.den = (fracMatch[2] || fracMatch[4] || '').trim()
    return state
  }

  // 4. Power: A^{B} or A^B or unicode powers (e.g. x², y³)
  const powMatch = s.match(/^(?:([a-zA-Z0-9]+)\^\{([^}]+)\}|([a-zA-Z0-9]+)\^([a-zA-Z0-9.-]+)|([a-zA-Z0-9]+)([²³⁴⁵⁶⁷⁸⁹]+))$/)
  if (powMatch) {
    state.template = 'power'
    state.base = (powMatch[1] || powMatch[3] || powMatch[5] || 'x').trim()
    state.exp = (powMatch[2] || powMatch[4] || powMatch[6] || '').trim()
    return state
  }

  // 5. Default to freeform expression
  state.template = 'expression'
  state.raw = s
  return state
}

/**
 * Formats a template state into a canonical math string for saving and grading
 */
export function formatMathTemplate(state: TemplateState): string {
  switch (state.template) {
    case 'fraction': {
      const num = state.num.trim()
      const den = state.den.trim()
      if (!num && !den) return ''
      if (!den) return num
      // If simple digits, format as num/den for clean compatibility, otherwise \frac{num}{den}
      if (/^-?\d+$/.test(num) && /^\d+$/.test(den)) {
        return `${num}/${den}`
      }
      return `\\frac{${num}}{${den}}`
    }
    case 'power': {
      const base = state.base.trim() || 'x'
      const exp = state.exp.trim()
      if (!exp) return base
      return `${base}^{${exp}}`
    }
    case 'root': {
      const rad = state.radicand.trim()
      if (!rad) return ''
      return `\\sqrt{${rad}}`
    }
    case 'limit': {
      const app = state.approaches.trim() || '0'
      const expr = state.expr.trim()
      if (!expr && !app) return ''
      return `\\lim_{x \\to ${app}} ${expr}`.trim()
    }
    case 'expression':
    default:
      return state.raw.trim()
  }
}
