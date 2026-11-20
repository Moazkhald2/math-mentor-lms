import { describe, it, expect } from 'vitest'
import {
  aggregateCommonWrongAnswers,
  resolveReadableAnswer,
  type RawWrongAnswerRow,
} from '../../lib/wrongAnswers'

const sampleRows: RawWrongAnswerRow[] = [
  {
    id: 'a1',
    question_id: 'q1',
    answer: '1',
    is_correct: false,
    exam_attempts: {
      user_id: 's1',
      exam_id: 'ex1',
      profiles: { full_name: 'Salma Hassan', grade: 7 },
      exams: { id: 'ex1', title: 'Monthly Exam 1', grade: 7, type: 'exam' },
    },
    questions: {
      id: 'q1',
      question_text: 'Solve 2x + 3 = 11',
      topic: 'Linear Equations',
      subject: 'Math',
      difficulty: 2,
      type: 'multiple_choice',
      options: ['x = 4', 'x = 7', 'x = -4', 'x = 14'],
      correct_answer: '0',
    },
  },
  {
    id: 'a2',
    question_id: 'q1',
    answer: '1',
    is_correct: false,
    exam_attempts: {
      user_id: 's2',
      exam_id: 'ex1',
      profiles: { full_name: 'Omar Ali', grade: 7 },
      exams: { id: 'ex1', title: 'Monthly Exam 1', grade: 7, type: 'exam' },
    },
    questions: {
      id: 'q1',
      question_text: 'Solve 2x + 3 = 11',
      topic: 'Linear Equations',
      subject: 'Math',
      difficulty: 2,
      type: 'multiple_choice',
      options: ['x = 4', 'x = 7', 'x = -4', 'x = 14'],
      correct_answer: '0',
    },
  },
  {
    id: 'a3',
    question_id: 'q1',
    answer: '2',
    is_correct: false,
    exam_attempts: {
      user_id: 's3',
      exam_id: 'ex1',
      profiles: { full_name: 'Youssef Karim', grade: 7 },
      exams: { id: 'ex1', title: 'Monthly Exam 1', grade: 7, type: 'exam' },
    },
    questions: {
      id: 'q1',
      question_text: 'Solve 2x + 3 = 11',
      topic: 'Linear Equations',
      subject: 'Math',
      difficulty: 2,
      type: 'multiple_choice',
      options: ['x = 4', 'x = 7', 'x = -4', 'x = 14'],
      correct_answer: '0',
    },
  },
  {
    id: 'a4',
    question_id: 'q2',
    answer: ' 12 ',
    is_correct: false,
    exam_attempts: {
      user_id: 's4',
      exam_id: 'ex2',
      profiles: { full_name: 'Nour Adel', grade: 9 },
      exams: { id: 'ex2', title: 'Grade 9 Sheet', grade: 9, type: 'practice' },
    },
    questions: {
      id: 'q2',
      question_text: 'Find 3^2 + 1',
      topic: 'Exponents',
      subject: 'Math',
      difficulty: 1,
      type: 'short_answer',
      options: [],
      correct_answer: '10',
    },
  },
]

describe('wrongAnswers aggregator', () => {
  it('resolves MCQ option indices to readable option text', () => {
    expect(resolveReadableAnswer('1', 'multiple_choice', ['x = 4', 'x = 7'])).toBe('x = 7')
    expect(resolveReadableAnswer('', 'short_answer', [])).toBe('(blank)')
  })

  it('ranks questions by total wrong answers and groups duplicate wrong answers', () => {
    const result = aggregateCommonWrongAnswers(sampleRows)
    expect(result).toHaveLength(2)
    expect(result[0].questionId).toBe('q1')
    expect(result[0].totalWrong).toBe(3)
    expect(result[0].correctAnswerDisplay).toBe('x = 4')
    expect(result[0].buckets[0]).toMatchObject({
      displayAnswer: 'x = 7',
      count: 2,
      percentOfWrong: 67,
      students: ['Omar Ali', 'Salma Hassan'],
    })
    expect(result[0].buckets[1]).toMatchObject({
      displayAnswer: 'x = -4',
      count: 1,
      percentOfWrong: 33,
    })
  })

  it('filters accurately by grade, groupStudentIds, studentId, and examId', () => {
    expect(aggregateCommonWrongAnswers(sampleRows, { grade: 9 })).toHaveLength(1)
    expect(aggregateCommonWrongAnswers(sampleRows, { grade: 9 })[0].questionId).toBe('q2')

    const groupOnly = aggregateCommonWrongAnswers(sampleRows, {
      groupStudentIds: new Set(['s1', 's3']),
    })
    expect(groupOnly).toHaveLength(1)
    expect(groupOnly[0].totalWrong).toBe(2)

    const singleStudent = aggregateCommonWrongAnswers(sampleRows, { studentId: 's2' })
    expect(singleStudent).toHaveLength(1)
    expect(singleStudent[0].buckets[0].students).toEqual(['Omar Ali'])

    const examOnly = aggregateCommonWrongAnswers(sampleRows, { examId: 'ex2' })
    expect(examOnly).toHaveLength(1)
    expect(examOnly[0].questionId).toBe('q2')
  })
})
