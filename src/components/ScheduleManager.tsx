import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchExams } from '../lib/exams'
import { fetchClasses } from '../lib/classes'
import {
  createExamAssignment,
  deleteExamAssignment,
  fetchExamAssignments,
  updateExamDefaultWindow,
  type GroupRecord,
} from '../lib/groups'
import { ALL_GRADES } from '../lib/grades'

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIsoOrNull(localVal: string): string | null {
  if (!localVal.trim()) return null
  const d = new Date(localVal)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function validateScheduleWindow(startsAt: string | null, endsAt: string | null): string | null {
  if (startsAt && endsAt) {
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return 'Deadline (Ends At) must be after Open Time (Starts At).'
    }
  }
  return null
}

interface ScheduleManagerProps {
  initialGrade?: number
}

export default function ScheduleManager({ initialGrade }: ScheduleManagerProps) {
  const queryClient = useQueryClient()
  const [gradeFilter, setGradeFilter] = useState<number | ''>(initialGrade ?? '')
  const [selectedExamId, setSelectedExamId] = useState('')
  const [defaultStarts, setDefaultStarts] = useState('')
  const [defaultEnds, setDefaultEnds] = useState('')
  const [slotGroupId, setSlotGroupId] = useState('')
  const [slotStarts, setSlotStarts] = useState('')
  const [slotEnds, setSlotEnds] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const { data: exams = [] } = useQuery({
    queryKey: ['admin-exams-list'],
    queryFn: fetchExams,
  })
  const { data: groups = [] } = useQuery<GroupRecord[]>({
    queryKey: ['admin-classes'],
    queryFn: fetchClasses as () => Promise<GroupRecord[]>,
  })
  const { data: assignments = [] } = useQuery({
    queryKey: ['exam-assignments'],
    queryFn: () => fetchExamAssignments(),
  })

  const filteredExams = useMemo(() => {
    if (gradeFilter === '') return exams
    return exams.filter((e) => e.grade === gradeFilter)
  }, [exams, gradeFilter])

  const selectedExam = useMemo(
    () => filteredExams.find((e) => e.id === selectedExamId) ?? filteredExams[0] ?? null,
    [filteredExams, selectedExamId]
  )

  const handleSelectExam = (examId: string) => {
    setSelectedExamId(examId)
    const found = exams.find((e) => e.id === examId)
    setDefaultStarts(toLocalInput(found?.starts_at))
    setDefaultEnds(toLocalInput(found?.ends_at))
    setFormError('')
    setFormSuccess('')
  }

  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const examMap = useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams])

  const eligibleGroups = useMemo(() => {
    const targetGrade = selectedExam?.grade ?? (gradeFilter !== '' ? gradeFilter : null)
    if (!targetGrade) return groups
    return groups.filter((g) => g.grade === targetGrade)
  }, [groups, selectedExam?.grade, gradeFilter])

  const examAssignments = useMemo(() => {
    if (!selectedExam) return []
    return assignments.filter((a) => a.exam_id === selectedExam.id)
  }, [assignments, selectedExam])

  const saveDefaultMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExam) return
      const sIso = toIsoOrNull(defaultStarts)
      const eIso = toIsoOrNull(defaultEnds)
      const err = validateScheduleWindow(sIso, eIso)
      if (err) throw new Error(err)
      await updateExamDefaultWindow(selectedExam.id, sIso, eIso)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams-list'] })
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      setFormError('')
      setFormSuccess('Default exam window saved.')
    },
    onError: (e: Error) => {
      setFormSuccess('')
      setFormError(e.message)
    },
  })

  const addSlotMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExam || !slotGroupId) throw new Error('Select a group first.')
      const sIso = toIsoOrNull(slotStarts)
      const eIso = toIsoOrNull(slotEnds)
      const err = validateScheduleWindow(sIso, eIso)
      if (err) throw new Error(err)
      return createExamAssignment({
        examId: selectedExam.id,
        targetType: 'group',
        targetGroupId: slotGroupId,
        startsAtOverride: sIso,
        endsAtOverride: eIso,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-assignments'] })
      setSlotGroupId('')
      setSlotStarts('')
      setSlotEnds('')
      setFormError('')
      setFormSuccess('Staggered group slot added.')
    },
    onError: (e: Error) => {
      setFormSuccess('')
      setFormError(e.message)
    },
  })

  const removeSlotMutation = useMutation({
    mutationFn: (id: string) => deleteExamAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-assignments'] })
      setFormError('')
    },
    onError: (e: Error) => setFormError(e.message),
  })

  // Chronological timeline of all scheduled exams & staggered group slots
  const timelineRows = useMemo(() => {
    const rows: {
      id: string
      title: string
      scope: string
      startsAt: string | null
      endsAt: string | null
      type: 'exam' | 'practice'
    }[] = []

    for (const ex of filteredExams) {
      if (ex.starts_at || ex.ends_at) {
        rows.push({
          id: `base-${ex.id}`,
          title: ex.title,
          scope: ex.grade ? `Grade ${ex.grade} (Default)` : 'Default Window',
          startsAt: ex.starts_at ?? null,
          endsAt: ex.ends_at ?? null,
          type: ex.type,
        })
      }
    }

    for (const a of assignments) {
      const ex = examMap.get(a.exam_id)
      if (!ex) continue
      if (gradeFilter !== '' && ex.grade !== gradeFilter) continue
      if (!a.starts_at_override && !a.ends_at_override) continue
      const grp = a.target_group_id ? groupMap.get(a.target_group_id) : null
      rows.push({
        id: `asg-${a.id}`,
        title: ex.title,
        scope:
          a.target_type === 'group'
            ? `Group: ${grp?.name ?? a.target_group_id}`
            : a.target_type === 'grade'
              ? `Grade ${a.target_grade}`
              : 'Single Student Override',
        startsAt: a.starts_at_override ?? ex.starts_at ?? null,
        endsAt: a.ends_at_override ?? ex.ends_at ?? null,
        type: ex.type,
      })
    }

    return rows.sort((a, b) => {
      const at = new Date(a.startsAt ?? a.endsAt ?? 0).getTime()
      const bt = new Date(b.startsAt ?? b.endsAt ?? 0).getTime()
      return at - bt
    })
  }, [filteredExams, assignments, examMap, groupMap, gradeFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">Schedule &amp; Staggered Group Deadlines</h1>
          <p className="text-sm text-text-muted">
            Set base open/close times per exam or sheet, then add staggered windows for each Group. Server RPCs enforce every deadline.
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
          <span>Grade</span>
          <select
            aria-label="Filter scheduler by grade"
            value={gradeFilter}
            onChange={(e) => {
              setGradeFilter(e.target.value ? Number(e.target.value) : '')
              setSelectedExamId('')
            }}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-normal text-ink"
          >
            <option value="">All grades</option>
            {ALL_GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      {formError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {formError}
        </div>
      )}
      {formSuccess && (
        <div className="rounded-xl border border-accent-green/30 bg-accent-green/10 px-4 py-2.5 text-sm text-accent-green">
          {formSuccess}
        </div>
      )}

      {/* Assessment Selector + Default Window Editor */}
      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Select Exam / Sheet
          </label>
          <select
            aria-label="Select exam or sheet to schedule"
            value={selectedExam?.id ?? ''}
            onChange={(e) => handleSelectExam(e.target.value)}
            className="min-w-[240px] flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
          >
            {filteredExams.length === 0 && <option value="">No exams/sheets in this grade</option>}
            {filteredExams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                [{ex.type === 'practice' ? 'Sheet' : 'Exam'}] {ex.title}
                {ex.grade ? ` (G${ex.grade})` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedExam && (
          <>
            <div className="border-t border-border pt-4">
              <h2 className="mb-3 text-sm font-bold text-ink">
                1. Default Open &amp; Close Window ({selectedExam.title})
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-muted">
                    Opens At (Default)
                  </label>
                  <input
                    aria-label="Default opens at"
                    type="datetime-local"
                    value={defaultStarts}
                    onChange={(e) => setDefaultStarts(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-muted">
                    Deadline / Ends At (Default)
                  </label>
                  <input
                    aria-label="Default ends at"
                    type="datetime-local"
                    value={defaultEnds}
                    onChange={(e) => setDefaultEnds(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => saveDefaultMutation.mutate()}
                    disabled={saveDefaultMutation.isPending}
                    className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {saveDefaultMutation.isPending ? 'Saving...' : 'Save Default Window'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultStarts('')
                      setDefaultEnds('')
                    }}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-muted hover:text-ink"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Staggered Per-Group Slots */}
            <div className="border-t border-border pt-4">
              <h2 className="mb-3 text-sm font-bold text-ink">
                2. Staggered Group Slots (Overrides Default Window per Group)
              </h2>
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-muted">Group</label>
                  <select
                    aria-label="Select group for staggered slot"
                    value={slotGroupId}
                    onChange={(e) => setSlotGroupId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink"
                  >
                    <option value="">Pick group...</option>
                    {eligibleGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        G{g.grade} · {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-muted">
                    Group Opens At
                  </label>
                  <input
                    aria-label="Group opens at"
                    type="datetime-local"
                    value={slotStarts}
                    onChange={(e) => setSlotStarts(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-muted">
                    Group Due At
                  </label>
                  <input
                    aria-label="Group due at"
                    type="datetime-local"
                    value={slotEnds}
                    onChange={(e) => setSlotEnds(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => addSlotMutation.mutate()}
                    disabled={!slotGroupId || addSlotMutation.isPending}
                    className="w-full rounded-lg bg-accent-green px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {addSlotMutation.isPending ? 'Adding...' : '+ Add Group Slot'}
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {examAssignments.length === 0 ? (
                  <p className="text-xs text-text-muted">
                    No staggered slots for this assessment yet. All students in its grade follow the default window.
                  </p>
                ) : (
                  examAssignments.map((a) => {
                    const grp = a.target_group_id ? groupMap.get(a.target_group_id) : null
                    return (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-alt/40 px-3.5 py-2.5 text-xs"
                      >
                        <div>
                          <span className="font-bold text-ink">
                            {a.target_type === 'group'
                              ? `Group: ${grp ? `G${grp.grade} · ${grp.name}` : a.target_group_id}`
                              : a.target_type === 'grade'
                                ? `Grade ${a.target_grade}`
                                : 'Single Student'}
                          </span>
                          <span className="ml-3 text-text-muted">
                            Opens: {a.starts_at_override ? new Date(a.starts_at_override).toLocaleString() : 'Default'}
                            {' · '}
                            Due: {a.ends_at_override ? new Date(a.ends_at_override).toLocaleString() : 'Default'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSlotMutation.mutate(a.id)}
                          disabled={removeSlotMutation.isPending}
                          className="font-semibold text-danger hover:underline"
                        >
                          Remove Slot
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Visual Schedule Timeline */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold text-ink">
          Scheduled Timeline ({timelineRows.length})
        </h2>
        {timelineRows.length === 0 ? (
          <p className="text-xs text-text-muted">
            No open/close deadlines configured yet. Set a default window or add a staggered group slot above.
          </p>
        ) : (
          <div className="space-y-2">
            {timelineRows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 font-semibold text-brand">
                    {row.type === 'practice' ? 'Sheet' : 'Exam'}
                  </span>
                  <span className="font-bold text-ink">{row.title}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-text-muted">
                    {row.scope}
                  </span>
                </div>
                <div className="text-text-muted">
                  {row.startsAt ? `Opens ${new Date(row.startsAt).toLocaleString()}` : 'Open immediately'}
                  {' → '}
                  {row.endsAt ? `Due ${new Date(row.endsAt).toLocaleString()}` : 'No close date'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
