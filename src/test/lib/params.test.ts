import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/shuffle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/shuffle')>()
  return { ...actual }
})

import {
  resolveParams,
  substitute,
  evaluateExpression,
  applyTemplate,
} from '../../lib/params'
import * as shuffle from '../../lib/shuffle'

describe('resolveParams', () => {
  const spec = { a: { min: 2, max: 9 }, b: { min: 1, max: 5 } }

  it('is deterministic for the same seed', () => {
    const p1 = resolveParams(spec, 'seed-1')
    const p2 = resolveParams(spec, 'seed-1')
    expect(p1).toEqual(p2)
  })

  it('produces values within bounds across many seeds', () => {
    for (let i = 0; i < 50; i++) {
      const p = resolveParams(spec, `seed-${i}`)
      expect(p.a).toBeGreaterThanOrEqual(2)
      expect(p.a).toBeLessThanOrEqual(9)
      expect(Number.isInteger(p.b)).toBe(true)
    }
  })

  it('varies across different seeds', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 10; i++) seen.add(resolveParams(spec, `vary-${i}`).a)
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('substitute', () => {
  it('replaces all occurrences including inside latex', () => {
    expect(substitute('$\\frac{{a}}{2}$ and {a} again', { a: 7 })).toBe(
      '$\\frac{7}{2}$ and 7 again',
    )
  })

  it('leaves unknown tokens untouched', () => {
    expect(substitute('{a} + {zz}', { a: 3 })).toBe('3 + {zz}')
  })
})

describe('evaluateExpression', () => {
  const params = { a: 5, b: 4 }

  it('respects operator precedence', () => {
    expect(evaluateExpression('2+3*4', params)).toBe(14)
  })

  it('evaluates param refs and parens', () => {
    expect(evaluateExpression('{a}*{b}', params)).toBe(20)
    expect(evaluateExpression('(10-{a})/2', params)).toBe(2.5)
  })

  it('handles unary minus', () => {
    expect(evaluateExpression('-{a}+5', params)).toBe(0)
  })

  it('rounds floating noise to 4dp', () => {
    expect(evaluateExpression('1/3*3', params)).toBe(1)
  })

  it('throws on division by zero', () => {
    expect(() => evaluateExpression('5/(3-3)', params)).toThrow()
  })

  it('rejects non-math input', () => {
    expect(() => evaluateExpression('{a}; DROP TABLE users', params)).toThrow()
    expect(() => evaluateExpression('alert(1)', params)).toThrow()
  })
})

describe('applyTemplate', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('keeps substituted text and answer mathematically consistent for short_answer', () => {
    const q = {
      question_text: 'Compute {a}+{b}',
      options: [] as string[],
      correct_answer: '{a}+{b}',
      type: 'short_answer',
      params: { a: { min: 2, max: 9 }, b: { min: 1, max: 5 } },
    }
    const out = applyTemplate(q, 'seed-42')
    const m = out.question_text.match(/Compute (\d+)\+(\d+)/)!
    expect(Number(out.correct_answer)).toBe(Number(m[1]) + Number(m[2]))
  })

  it('keeps MCQ correct_answer as index while substituting option values', () => {
    const q = {
      question_text: 'What is {a}+2?',
      options: ['{a}+2', 'wrong'],
      correct_answer: '0',
      type: 'multiple_choice',
      params: { a: { min: 2, max: 9 } },
    }
    const out = applyTemplate(q, 'seed-7')
    expect(['0', '1']).toContain(out.correct_answer)
    expect(out.question_text).not.toContain('{a}')
    expect(out.options.every((o) => !o.includes('{a}'))).toBe(true)
  })

  it('falls back to jitterQuestion when no params present', () => {
    const spy = vi.spyOn(shuffle, 'jitterQuestion').mockReturnValue({
      question_text: 'j',
      options: [],
      correct_answer: 'j',
    })
    const q = {
      question_text: 'plain 12 + 13',
      options: [] as string[],
      correct_answer: '25',
      type: 'short_answer',
      params: null,
    }
    applyTemplate(q, 's')
    expect(spy).toHaveBeenCalledOnce()
  })
})
