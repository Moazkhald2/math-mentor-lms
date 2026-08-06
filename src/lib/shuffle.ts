export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function mulberry32(seed: number): () => number {
  let state = seed | 0
  return () => {
    state = state + 0x6D2B79F5 | 0
    let t = Math.imul(state ^ state >>> 15, 1 | state)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(array: T[], seed: string): T[] {
  const rng = mulberry32(hashString(seed))
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function shuffleMultipleChoice(
  options: string[],
  correctAnswer: string,
  seed: string
): { options: string[]; correctAnswer: string } {
  const indexed = options.map((opt, i) => ({ opt, originalIndex: i }))
  const shuffled = seededShuffle(indexed, seed + '_opts')
  const newIdx = shuffled.findIndex(item => item.originalIndex === parseInt(correctAnswer))
  return {
    options: shuffled.map(item => item.opt),
    correctAnswer: String(newIdx),
  }
}
