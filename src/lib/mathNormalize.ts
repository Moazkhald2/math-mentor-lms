/**
 * Math Answer Normalizer & Equivalence Checker
 * Handles student math input variations (fractions, exponents, latex, spacing, unicode)
 */

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁻': '-', '⁺': '+', 'ⁿ': 'n',
}

const SUBSCRIPT_MAP: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
}

/**
 * Normalizes a math string into a canonical, comparable format
 */
export function normalizeMathAnswer(input: string | null | undefined): string {
  if (!input) return ''

  let s = input.trim()

  // Remove wrapping math delimiters if present ($...$, $$...$$)
  if (s.startsWith('$$') && s.endsWith('$$')) {
    s = s.slice(2, -2).trim()
  } else if (s.startsWith('$') && s.endsWith('$')) {
    s = s.slice(1, -1).trim()
  }

  // Replace runs of unicode exponents: e.g. y⁻¹ -> y^-1, x² -> x^2
  s = s.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ]+)/g, (_, run) => {
    return '^' + Array.from(run as string).map(c => SUPERSCRIPT_MAP[c] ?? c).join('')
  })

  // Replace runs of unicode subscripts: e.g. x₁₂ -> x_12
  s = s.replace(/([₀₁₂₃₄₅₆₇₈₉]+)/g, (_, run) => {
    return '_' + Array.from(run as string).map(c => SUBSCRIPT_MAP[c] ?? c).join('')
  })

  // Standardize unicode symbols
  s = s
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/±/g, '+-')
    .replace(/≠/g, '!=')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≈/g, '~=')
    .replace(/π/g, 'pi')
    .replace(/∞/g, 'inf')
    .replace(/√/g, 'sqrt')

  // Standardize common LaTeX commands to readable ascii
  // e.g. \frac{a}{b} -> (a)/(b)
  s = s.replace(/\\dfrac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
  s = s.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'root($1,$2)')
  s = s.replace(/\\times/g, '*')
  s = s.replace(/\\cdot/g, '*')
  s = s.replace(/\\div/g, '/')
  s = s.replace(/\\pm/g, '+-')
  s = s.replace(/\\le(q)?\b/g, '<=')
  s = s.replace(/\\ge(q)?\b/g, '>=')
  s = s.replace(/\\neq\b/g, '!=')
  s = s.replace(/\\approx\b/g, '~=')
  s = s.replace(/\\infty\b/g, 'inf')
  s = s.replace(/\\to\b/g, '->')
  s = s.replace(/\\pi\b/g, 'pi')
  s = s.replace(/\\left\(/g, '(')
  s = s.replace(/\\right\)/g, ')')
  s = s.replace(/\\left\[/g, '[')
  s = s.replace(/\\right\]/g, ']')
  s = s.replace(/\\left\|/g, '|')
  s = s.replace(/\\right\|/g, '|')

  // Normalize limit expressions: \lim_{x \to 0} or lim(x->0)
  s = s.replace(/\\lim_\{([^}]+)\}/g, 'lim($1)')
  s = s.replace(/\s+/g, ' ') // Collapse multiple whitespace

  // Normalize spaces around operators
  s = s.replace(/\s*([+\-*/^=<>!]|->|<=|>=|\!=|\~=)\s*/g, '$1')

  // Lowercase for case-insensitivity
  return s.toLowerCase().trim()
}

/**
 * Checks if a string represents a simple numeric value (integer, decimal, or fraction a/b)
 */
function tryParseNumber(str: string): number | null {
  const clean = str.replace(/[()]/g, '').trim()

  // Simple number or decimal (e.g. "4", "-3.5")
  if (/^-?\d+(\.\d+)?$/.test(clean)) {
    const val = parseFloat(clean)
    return isNaN(val) ? null : val
  }

  // Fraction (e.g. "1/2", "-3/4")
  const fracMatch = clean.match(/^(-?\d+)\/(\d+)$/)
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10)
    const den = parseInt(fracMatch[2], 10)
    if (den === 0) return null
    return num / den
  }

  return null
}

/**
 * Compares a student answer to a teacher's correct answer with fuzzy math tolerance
 */
export function isMathAnswerEqual(studentAns: string | null | undefined, correctAns: string | null | undefined): boolean {
  if (studentAns == null || correctAns == null) return false

  const rawStudent = studentAns.trim()
  const rawCorrect = correctAns.trim()

  // 1. Direct match (exact raw)
  if (rawStudent === rawCorrect) return true

  // 2. Simple case-insensitive match
  if (rawStudent.toLowerCase() === rawCorrect.toLowerCase()) return true

  // 3. Normalized math expression match
  const normStudent = normalizeMathAnswer(rawStudent)
  const normCorrect = normalizeMathAnswer(rawCorrect)

  if (normStudent === normCorrect) return true

  // 4. Numeric value equivalence (e.g. student wrote "1/2" or "\frac{1}{2}" and correct is "0.5")
  const numStudent = tryParseNumber(normStudent)
  const numCorrect = tryParseNumber(normCorrect)

  if (numStudent !== null && numCorrect !== null) {
    return Math.abs(numStudent - numCorrect) < 1e-6
  }

  return false
}
