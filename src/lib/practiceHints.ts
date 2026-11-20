import type { Question } from '../types'

export interface TieredHints {
  hint1: string
  hint2: string
  fullSolution: string
}

export type SimilarRetryMode = 'family' | 'params' | 'topic'

export interface SimilarProblemCandidate {
  mode: SimilarRetryMode
  question: Question
}

/**
 * Splits a multi-sentence or multi-line worked explanation into clean steps
 * without breaking LaTeX expressions unnecessarily.
 */
function splitExplanationSteps(explanation: string): string[] {
  const cleaned = (explanation ?? '').trim()
  if (!cleaned) return []

  // First try newline-separated steps
  const lines = cleaned
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (lines.length >= 2) return lines

  // Fall back to sentence splitting
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return sentences
}

/**
 * Builds a progressive 3-step learning ladder (Hint 1 -> Hint 2 -> Full Worked Solution)
 * for any practice question. Uses explicit `question.hints` when authored, and derives
 * clean non-spoiler progressive nudges from `topic`, `common_mistakes`, and `explanation`
 * for legacy questions.
 */
export function buildTieredHints(question: Question): TieredHints {
  const explicitHints = Array.isArray(question.hints)
    ? question.hints.map((h) => String(h ?? '').trim()).filter(Boolean)
    : []

  const steps = splitExplanationSteps(question.explanation)
  const topicLabel = question.topic?.trim() || 'this concept'
  const firstMistake = Array.isArray(question.common_mistakes) && question.common_mistakes.length > 0
    ? question.common_mistakes[0]
    : null

  const hint1 =
    explicitHints[0] ||
    (steps.length >= 3
      ? `First step: ${steps[0]}`
      : `Focus on the key rule for ${topicLabel}. Identify what is given and write down the first operation before calculating.`)

  const hint2 =
    explicitHints[1] ||
    (firstMistake
      ? `Watch out for a common slip: ${firstMistake.mistake}${firstMistake.why ? ` — ${firstMistake.why}` : ''}`
      : steps.length >= 3
        ? `Next step: ${steps[1]}`
        : steps.length === 2
          ? `Key step: ${steps[0]}`
          : `Check your signs, units, and each intermediate step carefully before choosing your final answer.`)

  const fullSolution =
    question.explanation?.trim() ||
    'Review the problem statement and check each calculation step carefully.'

  return { hint1, hint2, fullSolution }
}

/**
 * Encouraging, non-shaming practice feedback aligned with Draft 1 §12 & v3.0.
 */
export function getEncouragingFeedback(options: {
  isCorrect: boolean
  recoveredFromMistake: boolean
  hintsUsed: number
}): { title: string; subtitle: string } {
  const { isCorrect, recoveredFromMistake, hintsUsed } = options

  if (isCorrect && recoveredFromMistake) {
    return {
      title: 'Mistake Recovered!',
      subtitle: 'Awesome comeback — you learned from the last try and nailed a similar problem!',
    }
  }

  if (isCorrect && hintsUsed === 0) {
    return {
      title: 'Spot on!',
      subtitle: 'Solved independently without hints — great mastery.',
    }
  }

  if (isCorrect) {
    return {
      title: 'Great work!',
      subtitle: 'You used a hint well and worked through to the right answer.',
    }
  }

  return {
    title: 'Not quite yet — keep going!',
    subtitle: 'Mistakes are how math clicks. Check the steps below, then try a similar problem to lock it in.',
  }
}

/**
 * Finds the best structurally similar retry question using Question Families first
 * (`family_id` or `variant_group_id`), then parameterized fresh numbers (`params`),
 * then a same-topic/same-difficulty sibling in the current sheet.
 */
export function findSimilarFamilyCandidate(
  current: Question,
  allSheetQuestions: Question[],
  alreadyTriedIds: Set<string>
): SimilarProblemCandidate | null {
  const familyKey = current.family_id || current.variant_group_id

  // 1. Structural Question Family sibling (highest priority per v3.0 Step 15)
  if (familyKey) {
    const familySibling = allSheetQuestions.find(
      (q) =>
        q.id !== current.id &&
        !alreadyTriedIds.has(q.id) &&
        (q.family_id === familyKey || q.variant_group_id === familyKey)
    )
    if (familySibling) {
      return { mode: 'family', question: familySibling }
    }
  }

  // 2. Parameterized fresh-numbers template
  if (current.params && Object.keys(current.params).length > 0) {
    return { mode: 'params', question: current }
  }

  // 3. Same-topic sibling fallback within the sheet
  const normalizedTopic = (current.topic ?? '').trim().toLowerCase()
  if (normalizedTopic) {
    const topicSibling = allSheetQuestions.find(
      (q) =>
        q.id !== current.id &&
        !alreadyTriedIds.has(q.id) &&
        (q.topic ?? '').trim().toLowerCase() === normalizedTopic
    )
    if (topicSibling) {
      return { mode: 'topic', question: topicSibling }
    }
  }

  return null
}
