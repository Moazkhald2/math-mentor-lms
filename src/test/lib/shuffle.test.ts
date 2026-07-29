import { describe, it, expect } from 'vitest'
import { seededShuffle, shuffleMultipleChoice } from '../../lib/shuffle'

describe('seededShuffle', () => {
  it('preserves all elements', () => {
    const input = [1, 2, 3, 4, 5]
    const result = seededShuffle(input, 'test-seed')
    expect(result.sort()).toEqual(input.sort())
  })

  it('is deterministic with same seed', () => {
    const input = [1, 2, 3, 4, 5]
    const a = seededShuffle(input, 'deterministic')
    const b = seededShuffle(input, 'deterministic')
    expect(a).toEqual(b)
  })

  it('produces different order with different seed', () => {
    const input = [1, 2, 3, 4, 5]
    const a = seededShuffle(input, 'seed-a')
    const b = seededShuffle(input, 'seed-b')
    expect(a).not.toEqual(b)
  })

  it('handles empty array', () => {
    expect(seededShuffle([], 'any')).toEqual([])
  })

  it('handles single element', () => {
    expect(seededShuffle([42], 'any')).toEqual([42])
  })

  it('does not mutate original array', () => {
    const input = [1, 2, 3]
    const copy = [...input]
    seededShuffle(input, 'seed')
    expect(input).toEqual(copy)
  })

  it('handles string array', () => {
    const input = ['a', 'b', 'c', 'd']
    const result = seededShuffle(input, 'string-seed')
    expect(result).toHaveLength(4)
    expect(result.sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('works with objects', () => {
    const input = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const result = seededShuffle(input, 'obj-seed')
    expect(result).toHaveLength(3)
  })
})

describe('shuffleMultipleChoice', () => {
  it('returns correct index for correct answer', () => {
    const options = ['A: 1', 'B: 2', 'C: 3', 'D: 4']
    const correctIndex = '1'
    const result = shuffleMultipleChoice(options, correctIndex, 'mc-seed')
    expect(result.options).toHaveLength(4)
    const idx = parseInt(result.correctAnswer)
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThan(4)
  })

  it('keeps all original options', () => {
    const options = ['Alpha', 'Beta', 'Gamma']
    const result = shuffleMultipleChoice(options, '1', 'det')
    expect(result.options.sort()).toEqual(options.sort())
  })

  it('is deterministic', () => {
    const options = ['Alpha', 'Beta', 'Gamma']
    const a = shuffleMultipleChoice(options, '1', 'det')
    const b = shuffleMultipleChoice(options, '1', 'det')
    expect(a.options).toEqual(b.options)
    expect(a.correctAnswer).toBe(b.correctAnswer)
  })

  it('handles two options', () => {
    const options = ['True', 'False']
    const result = shuffleMultipleChoice(options, '0', 'tf-seed')
    expect(result.options).toHaveLength(2)
  })

  it('produces different order with different seed', () => {
    const options = ['A', 'B', 'C', 'D']
    const a = shuffleMultipleChoice(options, '0', 'seed-a')
    const b = shuffleMultipleChoice(options, '0', 'seed-b')
    expect(a.options).not.toEqual(b.options)
  })
})
