import { describe, it, expect } from 'vitest'
import { resolveVariant, variantForGroup } from '../../lib/variants'
import type { Question } from '../../types'

function q(id: string, group: string | null): Question {
  return { id, variant_group_id: group } as Question
}

describe('resolveVariant', () => {
  it('returns the same question when no variants exist', () => {
    const base = q('q1', 'g1')
    const result = resolveVariant(base, 'seed-a', [])
    expect(result).toBe(base)
  })

  it('deterministically picks the same variant for the same seed', () => {
    const base = q('q0', 'g1')
    const pool = [q('v0', 'g1'), q('v1', 'g1'), q('v2', 'g1')]
    const a = resolveVariant(base, 'seed-x', pool)
    const b = resolveVariant(base, 'seed-x', pool)
    expect(a.id).toBe(b.id)
  })

  it('picks a different variant for a different seed', () => {
    const base = q('q0', 'g1')
    const pool = [q('v0', 'g1'), q('v1', 'g1'), q('v2', 'g1')]
    const a = resolveVariant(base, 'seed-1', pool)
    const b = resolveVariant(base, 'seed-2', pool)
    expect(a.id).not.toBe(b.id)
  })

  it('only uses variants sharing the same group id', () => {
    const base = q('q0', 'g1')
    const pool = [q('v0', 'g1'), q('w0', 'g2')]
    const result = resolveVariant(base, 'any', pool)
    expect(result.id).toBe('v0')
  })
})

describe('variantForGroup', () => {
  it('returns null for an empty group id', () => {
    const pool = [q('v0', 'g1')]
    expect(variantForGroup('', pool, 'seed-a')).toBeNull()
  })

  it('returns null when the pool is empty', () => {
    expect(variantForGroup('g1', [], 'seed-a')).toBeNull()
  })

  it('is deterministic for a given group and seed', () => {
    const pool = [q('v0', 'g1'), q('v1', 'g1'), q('v2', 'g1')]
    const a = variantForGroup('g1', pool, 'seed-a')
    const b = variantForGroup('g1', pool, 'seed-a')
    expect(a).toBe(b)
  })
})