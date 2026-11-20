import { describe, it, expect } from 'vitest'
import {
  buildMonthGrid,
  computeScheduleStatus,
  resolveStudentSchedule,
} from '../../lib/schedule'
import type { Exam, ExamAttempt } from '../../types'
import type { ExamAssignment } from '../../lib/groups'

const NOW = new Date('2026-11-20T12:00:00Z').getTime()

function makeExam(overrides: Partial<Exam>): Exam {
  return {
    id: 'ex-1',
    title: 'Sample Exam',
    description: '',
    time_limit_minutes: 30,
    passing_score: 60,
    shuffle_questions: true,
    created_by: 't-1',
    created_at: '2026-11-01T00:00:00Z',
    is_published: true,
    type: 'exam',
    grade: 7,
    starts_at: null,
    ends_at: null,
    max_attempts: 3,
    cooldown_hours: 0,
    ...overrides,
  }
}

describe('schedule helpers', () => {
  it('computes all 5 status badges accurately', () => {
    expect(computeScheduleStatus(null, null, true, NOW)).toBe('completed')
    expect(computeScheduleStatus('2026-11-25T12:00:00Z', '2026-11-26T12:00:00Z', false, NOW)).toBe('upcoming')
    expect(computeScheduleStatus('2026-11-10T12:00:00Z', '2026-11-18T12:00:00Z', false, NOW)).toBe('overdue')
    expect(computeScheduleStatus('2026-11-19T12:00:00Z', '2026-11-21T12:00:00Z', false, NOW)).toBe('due_soon')
    expect(computeScheduleStatus('2026-11-19T12:00:00Z', '2026-11-30T12:00:00Z', false, NOW)).toBe('open_now')
  })

  it('applies student > group > grade assignment precedence and staggered overrides', () => {
    const exams: Exam[] = [
      makeExam({
        id: 'ex-staggered',
        title: 'Monthly Exam',
        starts_at: '2026-11-25T10:00:00Z',
        ends_at: '2026-11-26T10:00:00Z',
      }),
      makeExam({
        id: 'ex-other-group',
        title: 'Other Group Only',
      }),
      makeExam({
        id: 'ex-done',
        title: 'Completed Sheet',
        type: 'practice',
      }),
    ]

    const assignments: ExamAssignment[] = [
      {
        id: 'a-grade',
        exam_id: 'ex-staggered',
        target_type: 'grade',
        target_grade: 7,
        target_group_id: null,
        target_student_id: null,
        starts_at_override: '2026-11-24T10:00:00Z',
        ends_at_override: '2026-11-25T10:00:00Z',
        created_by: 't-1',
        created_at: '2026-11-01T00:00:00Z',
      },
      {
        id: 'a-group',
        exam_id: 'ex-staggered',
        target_type: 'group',
        target_grade: null,
        target_group_id: 'grp-1',
        target_student_id: null,
        starts_at_override: '2026-11-20T08:00:00Z',
        ends_at_override: '2026-11-21T08:00:00Z',
        created_by: 't-1',
        created_at: '2026-11-01T00:00:00Z',
      },
      {
        id: 'a-other',
        exam_id: 'ex-other-group',
        target_type: 'group',
        target_grade: null,
        target_group_id: 'grp-999',
        target_student_id: null,
        starts_at_override: null,
        ends_at_override: null,
        created_by: 't-1',
        created_at: '2026-11-01T00:00:00Z',
      },
    ]

    const attempts: ExamAttempt[] = [
      {
        id: 'att-1',
        user_id: 'stu-1',
        exam_id: 'ex-done',
        started_at: '2026-11-19T10:00:00Z',
        completed_at: '2026-11-19T10:20:00Z',
        score: 9,
        total_points: 10,
        status: 'completed',
      },
    ]

    const resolved = resolveStudentSchedule({
      exams,
      assignments,
      attempts,
      userId: 'stu-1',
      studentGrade: 7,
      groupIds: ['grp-1'],
      nowMs: NOW,
    })

    // ex-other-group is excluded because it has explicit assignment for grp-999 only
    expect(resolved.map((r) => r.exam.id)).toEqual(['ex-staggered', 'ex-done'])
    expect(resolved[0].scope).toBe('group')
    expect(resolved[0].status).toBe('due_soon')
    expect(resolved[0].endsAt).toBe('2026-11-21T08:00:00Z')
    expect(resolved[1].status).toBe('completed')
    expect(resolved[1].bestScorePct).toBe(90)
  })

  it('builds a 42-cell 6-week monthly calendar grid', () => {
    const cells = buildMonthGrid(2026, 10, new Date(2026, 10, 20))
    expect(cells).toHaveLength(42)
    expect(cells.find((c) => c.dateKey === '2026-11-20')?.isToday).toBe(true)
  })
})
