import type { Difficulty, QuestionType } from '../types'

export interface RawWrongAnswerRow {
  id: string
  question_id: string
  answer: string | null
  is_correct: boolean
  exam_attempts: {
    user_id: string
    exam_id: string
    profiles?: { full_name: string | null; email?: string | null; grade?: number | null } | null
    exams?: { id: string; title: string; grade?: number | null; type?: 'exam' | 'practice' } | null
  } | null
  questions: {
    id: string
    question_text: string
    topic: string
    subject: string
    difficulty: Difficulty
    type: QuestionType
    options?: string[] | null
    correct_answer: string
  } | null
}

export interface WrongAnswerBucket {
  key: string
  displayAnswer: string
  count: number
  percentOfWrong: number
  students: string[]
}

export interface QuestionWrongSummary {
  questionId: string
  questionText: string
  topic: string
  subject: string
  difficulty: Difficulty
  type: QuestionType
  correctAnswerDisplay: string
  examTitles: string[]
  totalWrong: number
  buckets: WrongAnswerBucket[]
}

export interface WrongAnswerFilters {
  grade?: number
  groupStudentIds?: Set<string>
  studentId?: string
  examId?: string
}

export function resolveReadableAnswer(
  raw: string | null | undefined,
  type: QuestionType,
  options?: string[] | null
): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return '(blank)'
  if (type === 'multiple_choice' && Array.isArray(options) && options.length > 0) {
    const idx = Number(trimmed)
    if (Number.isInteger(idx) && idx >= 0 && idx < options.length && String(idx) === trimmed) {
      return options[idx]
    }
  }
  return trimmed
}

export function aggregateCommonWrongAnswers(
  rows: RawWrongAnswerRow[],
  filters: WrongAnswerFilters = {}
): QuestionWrongSummary[] {
  const { grade, groupStudentIds, studentId, examId } = filters

  const byQuestion = new Map<
    string,
    {
      q: NonNullable<RawWrongAnswerRow['questions']>
      examTitles: Set<string>
      totalWrong: number
      bucketMap: Map<string, { displayAnswer: string; count: number; students: Set<string> }>
    }
  >()

  for (const row of rows) {
    if (row.is_correct) continue
    const q = row.questions
    const att = row.exam_attempts
    if (!q || !att) continue

    if (studentId && att.user_id !== studentId) continue
    if (groupStudentIds && !groupStudentIds.has(att.user_id)) continue
    if (examId && att.exam_id !== examId) continue
    if (grade != null) {
      const rowGrade = att.exams?.grade ?? att.profiles?.grade ?? null
      if (rowGrade !== grade) continue
    }

    let entry = byQuestion.get(q.id)
    if (!entry) {
      entry = {
        q,
        examTitles: new Set<string>(),
        totalWrong: 0,
        bucketMap: new Map(),
      }
      byQuestion.set(q.id, entry)
    }

    if (att.exams?.title) entry.examTitles.add(att.exams.title)
    entry.totalWrong += 1

    const displayAnswer = resolveReadableAnswer(row.answer, q.type, q.options)
    const normKey = displayAnswer.replace(/\s+/g, ' ').trim().toLowerCase()
    const studentLabel = att.profiles?.full_name || att.profiles?.email || 'Student'

    let bucket = entry.bucketMap.get(normKey)
    if (!bucket) {
      bucket = { displayAnswer, count: 0, students: new Set<string>() }
      entry.bucketMap.set(normKey, bucket)
    }
    bucket.count += 1
    bucket.students.add(studentLabel)
  }

  const summaries: QuestionWrongSummary[] = []
  for (const entry of byQuestion.values()) {
    const buckets: WrongAnswerBucket[] = [...entry.bucketMap.entries()]
      .map(([key, b]) => ({
        key,
        displayAnswer: b.displayAnswer,
        count: b.count,
        percentOfWrong: Math.round((b.count / entry.totalWrong) * 100),
        students: [...b.students].sort(),
      }))
      .sort((a, b) => b.count - a.count || a.displayAnswer.localeCompare(b.displayAnswer))

    summaries.push({
      questionId: entry.q.id,
      questionText: entry.q.question_text,
      topic: entry.q.topic,
      subject: entry.q.subject,
      difficulty: entry.q.difficulty,
      type: entry.q.type,
      correctAnswerDisplay: resolveReadableAnswer(
        entry.q.correct_answer,
        entry.q.type,
        entry.q.options
      ),
      examTitles: [...entry.examTitles].sort(),
      totalWrong: entry.totalWrong,
      buckets,
    })
  }

  return summaries.sort((a, b) => b.totalWrong - a.totalWrong)
}
