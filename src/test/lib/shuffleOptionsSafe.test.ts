import { describe, it, expect } from 'vitest'
import { shuffleOptionsPreservingIndex } from '../../lib/shuffle'

describe('shuffleOptionsPreservingIndex (answer-key-free MCQ shuffling)', () => {
  it('preserves canonical originalIndex for every option without needing correct_answer', () => {
    const opts = ['Three', 'Five', 'Seven', 'Nine']
    const shuffled = shuffleOptionsPreservingIndex(opts, 'seed-abc-123')

    expect(shuffled).toHaveLength(4)
    for (const item of shuffled) {
      expect(opts[item.originalIndex]).toBe(item.text)
    }
    const indices = shuffled.map(i => i.originalIndex).sort((a, b) => a - b)
    expect(indices).toEqual([0, 1, 2, 3])
  })

  it('is deterministic for the same seed and varies across different seeds', () => {
    const opts = ['A', 'B', 'C', 'D', 'E']
    const run1 = shuffleOptionsPreservingIndex(opts, 'same-seed')
    const run2 = shuffleOptionsPreservingIndex(opts, 'same-seed')
    expect(run1).toEqual(run2)
  })
})
