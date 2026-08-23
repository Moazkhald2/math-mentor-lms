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

// Numeric jitter: change numbers inside text using date+seed for anti-cheat
// Only jitters small integers 2-99, delta -2..+2, keeps LaTeX valid
export function jitterNumbers(text: string, seed: string): string {
  const rng = mulberry32(hashString(seed + '_jitter'))
  return text.replace(/\b(\d{1,2})\b/g, (m, nStr) => {
    const n = parseInt(nStr, 10)
    if (n < 2 || n > 99) return m
    const delta = Math.floor(rng() * 5) - 2
    if (delta === 0) return m
    const next = n + delta
    if (next < 2) return m
    return String(next)
  })
}

// Apply jitter to whole question (text + options + correct_answer if numeric short answer)
export function jitterQuestion(q: { question_text: string; options: string[]; correct_answer: string; type: string }, seed: string) {
  const text = jitterNumbers(q.question_text, seed)
  const options = q.options.map(o => jitterNumbers(o, seed + '_opt'))
  let correct = q.correct_answer
  if (q.type === 'short_answer' && /^\d+$/.test(correct.trim())) {
    correct = jitterNumbers(correct, seed)
  }
  // For MCQ, correct_answer is index, not jittered
  return { question_text: text, options, correct_answer: correct }
}
