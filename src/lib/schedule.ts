import type { Exam, ExamAttempt } from '../types'
import type { ExamAssignment } from './groups'

export type ScheduleStatus = 'completed' | 'upcoming' | 'open_now' | 'due_soon' | 'overdue'
export type AssignmentScope = 'student' | 'group' | 'grade' | 'general'

export interface ScheduledAssessment {
  exam: Exam
  scope: AssignmentScope
  startsAt: string | null
  endsAt: string | null
  status: ScheduleStatus
  completedAttemptId: string | null
  bestScorePct: number | null
}

export interface CalendarCell {
  dateKey: string // YYYY-MM-DD
  day: number
  inCurrentMonth: boolean
  isToday: boolean
}

const DUE_SOON_MS = 48 * 60 * 60 * 1000 // 48 hours

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function computeScheduleStatus(
  startsAt: string | null,
  endsAt: string | null,
  isCompleted: boolean,
  nowMs: number = Date.now()
): ScheduleStatus {
  if (isCompleted) return 'completed'
  const startMs = startsAt ? new Date(startsAt).getTime() : null
  const endMs = endsAt ? new Date(endsAt).getTime() : null

  if (startMs !== null && !Number.isNaN(startMs) && nowMs < startMs) {
    return 'upcoming'
  }
  if (endMs !== null && !Number.isNaN(endMs) && nowMs > endMs) {
    return 'overdue'
  }
  if (endMs !== null && !Number.isNaN(endMs) && endMs - nowMs <= DUE_SOON_MS) {
    return 'due_soon'
  }
  return 'open_now'
}

export function resolveStudentSchedule(params: {
  exams: Exam[]
  assignments: ExamAssignment[]
  attempts: ExamAttempt[]
  userId: string
  studentGrade: number | null
  groupIds: string[]
  nowMs?: number
}): ScheduledAssessment[] {
  const { exams, assignments, attempts, userId, studentGrade, groupIds, nowMs = Date.now() } = params
  const groupSet = new Set(groupIds)

  const assignmentsByExam = new Map<string, ExamAssignment[]>()
  for (const a of assignments) {
    const list = assignmentsByExam.get(a.exam_id) ?? []
    list.push(a)
    assignmentsByExam.set(a.exam_id, list)
  }

  const attemptsByExam = new Map<string, ExamAttempt[]>()
  for (const att of attempts) {
    const list = attemptsByExam.get(att.exam_id) ?? []
    list.push(att)
    attemptsByExam.set(att.exam_id, list)
  }

  const results: ScheduledAssessment[] = []

  for (const exam of exams) {
    if (!exam.is_published) continue

    const examAssignments = assignmentsByExam.get(exam.id) ?? []
    let matchedAssignment: ExamAssignment | null = null
    let scope: AssignmentScope | null = null

    if (examAssignments.length > 0) {
      // Strict precedence: single student > group > grade
      const studentMatch = examAssignments.find(
        (a) => a.target_type === 'student' && a.target_student_id === userId
      )
      const groupMatch = examAssignments.find(
        (a) => a.target_type === 'group' && a.target_group_id && groupSet.has(a.target_group_id)
      )
      const gradeMatch = examAssignments.find(
        (a) => a.target_type === 'grade' && studentGrade != null && a.target_grade === studentGrade
      )

      if (studentMatch) {
        matchedAssignment = studentMatch
        scope = 'student'
      } else if (groupMatch) {
        matchedAssignment = groupMatch
        scope = 'group'
      } else if (gradeMatch) {
        matchedAssignment = gradeMatch
        scope = 'grade'
      } else {
        // Exam has explicit assignments that do not include this student
        continue
      }
    } else {
      // No explicit assignments -> fallback to exam.grade match
      if (exam.grade != null && studentGrade != null && exam.grade !== studentGrade) {
        continue
      }
      scope = exam.grade != null ? 'grade' : 'general'
    }

    const startsAt = matchedAssignment?.starts_at_override ?? exam.starts_at ?? null
    const endsAt = matchedAssignment?.ends_at_override ?? exam.ends_at ?? null

    const myAttempts = attemptsByExam.get(exam.id) ?? []
    const completed = myAttempts.filter((a) => a.status === 'completed')
    const latestCompleted = completed[0] ?? null
    const bestScorePct =
      completed.length > 0
        ? Math.max(
            ...completed.map((a) =>
              a.total_points ? Math.round(((a.score ?? 0) / a.total_points) * 100) : 0
            )
          )
        : null

    const status = computeScheduleStatus(startsAt, endsAt, completed.length > 0, nowMs)

    results.push({
      exam,
      scope,
      startsAt,
      endsAt,
      status,
      completedAttemptId: latestCompleted?.id ?? null,
      bestScorePct,
    })
  }

  // Sort: due_soon -> open_now -> upcoming -> overdue -> completed, then by earliest deadline/start
  const priority: Record<ScheduleStatus, number> = {
    due_soon: 0,
    open_now: 1,
    upcoming: 2,
    overdue: 3,
    completed: 4,
  }

  return results.sort((a, b) => {
    if (priority[a.status] !== priority[b.status]) {
      return priority[a.status] - priority[b.status]
    }
    const aTime = new Date(a.endsAt ?? a.startsAt ?? a.exam.created_at).getTime()
    const bTime = new Date(b.endsAt ?? b.startsAt ?? b.exam.created_at).getTime()
    return aTime - bTime
  })
}

export function buildMonthGrid(year: number, monthIndex: number, today: Date = new Date()): CalendarCell[] {
  const firstDay = new Date(year, monthIndex, 1)
  const startOffset = firstDay.getDay() // 0 = Sun
  const gridStart = new Date(year, monthIndex, 1 - startOffset)
  const todayKey = toLocalDateKey(today)

  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    const key = toLocalDateKey(d)
    cells.push({
      dateKey: key,
      day: d.getDate(),
      inCurrentMonth: d.getMonth() === monthIndex,
      isToday: key === todayKey,
    })
  }
  return cells
}
