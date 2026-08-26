import { hashString, mulberry32, jitterQuestion } from './shuffle'

export type ParamSpec = { min: number; max: number }
export type ParamMap = Record<string, number>

interface TemplateQuestion {
  question_text: string
  options: string[]
  correct_answer: string
  type: string
  params?: Record<string, ParamSpec> | null
}

/** Draw one integer in [min,max] per key, deterministically from seed. */
export function resolveParams(
  spec: Record<string, ParamSpec>,
  seed: string,
): ParamMap {
  const rng = mulberry32(hashString(seed + '_params'))
  const out: ParamMap = {}
  for (const key of Object.keys(spec).sort()) {
    const { min, max } = spec[key]
    const span = Math.max(0, Math.floor(max) - Math.floor(min))
    out[key] = Math.floor(min) + Math.floor(rng() * (span + 1))
  }
  return out
}

/** Replace every {key} token with its resolved value; unknown tokens survive. */
export function substitute(text: string, params: ParamMap): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : m,
  )
}

type Token = number | string | '(' | ')'

function tokenize(expr: string, params: ParamMap): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < expr.length) {
    const ch = expr[i]
    if (ch === ' ' || ch === '\t') {
      i++
      continue
    }
    if (ch === '{') {
      const end = expr.indexOf('}', i)
      if (end === -1) throw new Error('unterminated param ref')
      const key = expr.slice(i + 1, end)
      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        throw new Error(`unknown param ${key}`)
      }
      tokens.push(params[key])
      i = end + 1
      continue
    }
    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++
      const num = Number(expr.slice(i, j))
      if (!Number.isFinite(num)) throw new Error('bad number')
      tokens.push(num)
      i = j
      continue
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push(ch)
      i++
      continue
    }
    throw new Error(`illegal character "${ch}"`)
  }
  return tokens
}

/**
 * Safe arithmetic evaluator for template answers.
 * Supports integers/decimals, {param} refs, + - * /, parens, unary minus.
 * No eval(). Throws on anything unexpected. Rounds float noise to 4dp.
 */
export function evaluateExpression(expr: string, params: ParamMap): number {
  const tokens = tokenize(expr, params)
  let pos = 0

  const peek = () => tokens[pos]

  function parseExpr(): number {
    let value = parseTerm()
    for (;;) {
      const t = peek()
      if (t === '+') {
        pos++
        value += parseTerm()
      } else if (t === '-') {
        pos++
        value -= parseTerm()
      } else {
        return value
      }
    }
  }

  function parseTerm(): number {
    let value = parseFactor()
    for (;;) {
      const t = peek()
      if (t === '*') {
        pos++
        value *= parseFactor()
      } else if (t === '/') {
        pos++
        const d = parseFactor()
        if (d === 0) throw new Error('division by zero')
        value /= d
      } else {
        return value
      }
    }
  }

  function parseFactor(): number {
    const t = peek()
    if (t === '-') {
      pos++
      return -parseFactor()
    }
    if (t === '+') {
      pos++
      return parseFactor()
    }
    if (t === '(') {
      pos++
      const v = parseExpr()
      if (peek() !== ')') throw new Error('missing )')
      pos++
      return v
    }
    if (typeof t === 'number') {
      pos++
      return t
    }
    throw new Error('unexpected token')
  }

  const result = parseExpr()
  if (pos !== tokens.length) throw new Error('trailing tokens')
  return Math.round(result * 10000) / 10000
}

/**
 * Resolve a question for one attempt:
 * - params present → substitute text+options from resolved values,
 *   evaluate short_answer correct_answer as expression over same params
 *   (guarantees displayed problem and answer key stay consistent).
 * - no params → legacy numeric jitter path.
 */
export function applyTemplate<T extends TemplateQuestion>(q: T, seed: string): T {
  if (!q.params || Object.keys(q.params).length === 0) {
    return jitterQuestion(q as never, seed) as unknown as T
  }
  const params = resolveParams(q.params, seed)
  const question_text = substitute(q.question_text, params)
  const options = q.options.map((o) => substitute(o, params))
  let correct_answer = q.correct_answer
  if (q.type === 'short_answer') {
    const evaluated = evaluateExpression(substitute(correct_answer, params), params)
    correct_answer = String(evaluated)
  }
  return { ...q, question_text, options, correct_answer }
}
