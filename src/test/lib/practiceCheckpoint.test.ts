import { describe, it, expect, beforeEach } from 'vitest'
import {
  savePracticeCheckpoint,
  loadPracticeCheckpoint,
  clearPracticeCheckpoint,
  listLocalPracticeCheckpoints,
} from '../../lib/practice'

describe('practice checkpoint localStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves, loads, lists, and clears per-user practice checkpoints', () => {
    const cp = {
      attemptId: 'att-1',
      examId: 'sheet-1',
      userId: 'user-a',
      currentIndex: 2,
      totalQuestions: 5,
      answeredMap: {
        'q-1': { answer: '1', isCorrect: true },
        'q-2': { answer: '0', isCorrect: false },
      },
      updatedAt: '2026-11-20T20:00:00Z',
    }

    savePracticeCheckpoint(cp)

    // Another user's checkpoint should stay isolated
    savePracticeCheckpoint({
      ...cp,
      userId: 'user-b',
      examId: 'sheet-2',
    })

    expect(loadPracticeCheckpoint('user-a', 'sheet-1')).toEqual(cp)
    expect(loadPracticeCheckpoint('user-a', 'sheet-2')).toBeNull()

    const listed = listLocalPracticeCheckpoints('user-a')
    expect(Object.keys(listed)).toEqual(['sheet-1'])

    clearPracticeCheckpoint('user-a', 'sheet-1')
    expect(loadPracticeCheckpoint('user-a', 'sheet-1')).toBeNull()
  })
})
