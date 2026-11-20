import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fetchExams } from '../lib/exams'
import { fetchExamAssignments } from '../lib/groups'
import {
  buildMonthGrid,
  resolveStudentSchedule,
  toLocalDateKey,
  type ScheduleStatus,
  type ScheduledAssessment,
} from '../lib/schedule'
import type { ExamAttempt } from '../types'

const STATUS_META: Record<
  ScheduleStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  due_soon: {
    label: 'Due Soon',
    badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    dotClass: 'bg-amber-500',
  },
  open_now: {
    label: 'Open Now',
    badgeClass: 'bg-brand/15 text-brand border-brand/30',
    dotClass: 'bg-brand',
  },
  upcoming: {
    label: 'Upcoming',
    badgeClass: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
    dotClass: 'bg-sky-500',
  },
  overdue: {
    label: 'Overdue',
    badgeClass: 'bg-danger/15 text-danger border-danger/30',
    dotClass: 'bg-danger',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-accent-green/15 text-accent-green border-accent-green/30',
    dotClass: 'bg-accent-green',
  },
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Schedule() {
  const { user } = useAuth()
  const now = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | 'all'>('all')
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)

  const profileQ = useQuery({
    queryKey: ['schedule-profile', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase
        .from('profiles')
        .select('grade')
        .eq('id', user.id)
        .single()
      return data as { grade: number | null } | null
    },
    enabled: !!user,
  })

  const membershipsQ = useQuery({
    queryKey: ['schedule-groups', user?.id],
    queryFn: async () => {
      if (!user) return [] as string[]
      const { data } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id)
      return (data ?? []).map((r: { class_id: string }) => r.class_id)
    },
    enabled: !!user,
  })

  const examsQ = useQuery({
    queryKey: ['exams'],
    queryFn: fetchExams,
    enabled: !!user,
  })

  const assignmentsQ = useQuery({
    queryKey: ['exam-assignments'],
    queryFn: () => fetchExamAssignments(),
    enabled: !!user,
  })

  const attemptsQ = useQuery({
    queryKey: ['my-exam-attempts', user?.id],
    queryFn: async () => {
      if (!user) return [] as ExamAttempt[]
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ExamAttempt[]
    },
    enabled: !!user,
  })

  const scheduledItems = useMemo(() => {
    if (!user) return []
    return resolveStudentSchedule({
      exams: examsQ.data ?? [],
      assignments: assignmentsQ.data ?? [],
      attempts: attemptsQ.data ?? [],
      userId: user.id,
      studentGrade: profileQ.data?.grade ?? null,
      groupIds: membershipsQ.data ?? [],
    })
  }, [user, examsQ.data, assignmentsQ.data, attemptsQ.data, profileQ.data?.grade, membershipsQ.data])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ScheduledAssessment[]>()
    for (const item of scheduledItems) {
      const anchorIso = item.endsAt ?? item.startsAt
      if (!anchorIso) continue
      const d = new Date(anchorIso)
      if (Number.isNaN(d.getTime())) continue
      const key = toLocalDateKey(d)
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  }, [scheduledItems])

  const counts = useMemo(() => {
    const c: Record<ScheduleStatus, number> = {
      due_soon: 0,
      open_now: 0,
      upcoming: 0,
      overdue: 0,
      completed: 0,
    }
    for (const item of scheduledItems) c[item.status] += 1
    return c
  }, [scheduledItems])

  const visibleItems = useMemo(() => {
    return scheduledItems.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (selectedDateKey) {
        const anchorIso = item.endsAt ?? item.startsAt
        if (!anchorIso) return false
        const key = toLocalDateKey(new Date(anchorIso))
        if (key !== selectedDateKey) return false
      }
      return true
    })
  }, [scheduledItems, statusFilter, selectedDateKey])

  const monthCells = useMemo(() => buildMonthGrid(viewYear, viewMonth, now), [viewYear, viewMonth, now])
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const isLoading = examsQ.isLoading || profileQ.isLoading

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            My Schedule &amp; Deadlines
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Exams and practice sheets assigned to your Grade, Group, or directly to you.
          </p>
        </div>
        {profileQ.data?.grade && (
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
            Grade {profileQ.data.grade}
          </span>
        )}
      </header>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setStatusFilter('all')
            setSelectedDateKey(null)
          }}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            statusFilter === 'all' && !selectedDateKey
              ? 'border-brand bg-brand text-white'
              : 'border-border bg-surface text-text-muted hover:border-brand'
          }`}
        >
          All ({scheduledItems.length})
        </button>
        {(Object.keys(STATUS_META) as ScheduleStatus[]).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(statusFilter === st ? 'all' : st)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              statusFilter === st
                ? 'border-brand bg-brand text-white'
                : 'border-border bg-surface text-text-muted hover:border-brand'
            }`}
          >
            {STATUS_META[st].label} ({counts[st]})
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Monthly Calendar */}
        <section
          aria-label="Monthly calendar"
          className="rounded-2xl border border-border bg-surface p-4 lg:col-span-2"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">{monthLabel}</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text-muted hover:border-brand hover:text-brand"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewYear(now.getFullYear())
                  setViewMonth(now.getMonth())
                  setSelectedDateKey(null)
                }}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text-muted hover:border-brand hover:text-brand"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text-muted hover:border-brand hover:text-brand"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-text-muted">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell) => {
              const dayItems = itemsByDate.get(cell.dateKey) ?? []
              const isSelected = selectedDateKey === cell.dateKey
              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() =>
                    setSelectedDateKey(isSelected ? null : cell.dateKey)
                  }
                  className={`flex min-h-[48px] flex-col items-center justify-between rounded-lg border p-1 text-xs transition ${
                    isSelected
                      ? 'border-brand bg-brand/15 font-bold text-ink'
                      : cell.isToday
                        ? 'border-brand/60 bg-brand/5 font-bold text-brand'
                        : cell.inCurrentMonth
                          ? 'border-border/60 bg-surface text-ink hover:border-brand/50'
                          : 'border-transparent bg-transparent text-text-muted/40'
                  }`}
                >
                  <span>{cell.day}</span>
                  {dayItems.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      {dayItems.slice(0, 3).map((it) => (
                        <span
                          key={it.exam.id}
                          className={`h-1.5 w-1.5 rounded-full ${STATUS_META[it.status].dotClass}`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {selectedDateKey && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-brand/5 px-3 py-1.5 text-xs">
              <span className="text-ink">
                Showing items on <strong>{selectedDateKey}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDateKey(null)}
                className="font-semibold text-brand hover:underline"
              >
                Clear date
              </button>
            </div>
          )}
        </section>

        {/* Deadlines & Assigned Assessments List */}
        <section aria-label="Upcoming deadlines" className="space-y-3 lg:col-span-3">
          {isLoading && (
            <p className="py-8 text-center text-sm text-text-muted">Loading your schedule...</p>
          )}

          {!isLoading && visibleItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
              <p className="text-sm font-medium text-ink">
                No exams or practice sheets match this filter.
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Check another status tab or clear the selected date on the calendar.
              </p>
            </div>
          )}

          {visibleItems.map((item) => {
            const meta = STATUS_META[item.status]
            const targetPath =
              item.exam.type === 'practice'
                ? `/practice/${item.exam.id}`
                : `/exam/${item.exam.id}`
            const canEnter = item.status === 'open_now' || item.status === 'due_soon'

            return (
              <div
                key={item.exam.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                      {item.exam.type === 'practice' ? 'Practice Sheet' : 'Exam'}
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted capitalize">
                      {item.scope === 'student'
                        ? 'Assigned to You'
                        : item.scope === 'group'
                          ? 'Your Group'
                          : item.scope === 'grade'
                            ? `Grade ${item.exam.grade ?? profileQ.data?.grade ?? ''}`
                            : 'General'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-ink">{item.exam.title}</h3>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                    {item.startsAt && (
                      <span>Opens: {new Date(item.startsAt).toLocaleString()}</span>
                    )}
                    {item.endsAt && (
                      <span>Due: {new Date(item.endsAt).toLocaleString()}</span>
                    )}
                    {!item.startsAt && !item.endsAt && <span>Always available</span>}
                    {item.bestScorePct !== null && (
                      <span className="font-semibold text-accent-green">
                        Best Score: {item.bestScorePct}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.completedAttemptId && (
                    <Link
                      to={`/results/${item.completedAttemptId}`}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
                    >
                      View Results
                    </Link>
                  )}
                  {canEnter && (
                    <Link
                      to={targetPath}
                      className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                    >
                      {item.exam.type === 'practice' ? 'Open Sheet →' : 'Start Exam →'}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
