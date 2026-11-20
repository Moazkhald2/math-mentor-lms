import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchClasses,
  createClass,
  deleteClass,
  fetchClassMembers,
  addStudentToClass,
  removeStudentFromClass,
  moveStudentToClass,
  fetchAvailableStudents,
  fetchAvailableTeachers,
} from '../../lib/classes'
import { fetchExams } from '../../lib/exams'
import {
  buildGroupInviteUrl,
  createExamAssignment,
  deleteExamAssignment,
  fetchExamAssignments,
  updateGroupInviteSettings,
  type GroupRecord,
} from '../../lib/groups'
import { ALL_GRADES } from '../../lib/grades'
import StudentIdentity from '../../components/StudentIdentity'
import GroupInviteQrModal from '../../components/GroupInviteQrModal'
import StudentInspectorModal, { type InspectedStudent } from '../../components/StudentInspectorModal'

interface GroupSettingsDraft {
  scheduleNote: string
  maxStudents: string
  expiresAt: string
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminClasses() {
  const queryClient = useQueryClient()

  // Level 1: Grade filter ('all' or 1..12)
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all')

  // Create group form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState<number>(7)
  const [newTeacher, setNewTeacher] = useState('')
  const [createError, setCreateError] = useState('')

  // Level 2 & 3 interactive states
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [settingsClassId, setSettingsClassId] = useState<string | null>(null)
  const [settingsDraft, setSettingsDraft] = useState<GroupSettingsDraft>({
    scheduleNote: '',
    maxStudents: '',
    expiresAt: '',
  })
  const [copiedClassId, setCopiedClassId] = useState<string | null>(null)
  const [qrGroup, setQrGroup] = useState<GroupRecord | null>(null)
  const [inspectedStudent, setInspectedStudent] = useState<InspectedStudent | null>(null)
  const [addStudentId, setAddStudentId] = useState('')
  const [gradeAssignExamId, setGradeAssignExamId] = useState('')
  const [groupAssignExamId, setGroupAssignExamId] = useState('')
  const [feedbackError, setFeedbackError] = useState('')

  const { data: classes = [] } = useQuery<GroupRecord[]>({
    queryKey: ['admin-classes'],
    queryFn: fetchClasses as () => Promise<GroupRecord[]>,
  })
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: fetchAvailableTeachers,
  })
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: fetchAvailableStudents,
  })
  const { data: exams = [] } = useQuery({
    queryKey: ['admin-exams-list'],
    queryFn: fetchExams,
  })
  const { data: assignments = [] } = useQuery({
    queryKey: ['exam-assignments'],
    queryFn: () => fetchExamAssignments(),
  })
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ['class-members', expandedClass],
    queryFn: () => fetchClassMembers(expandedClass!),
    enabled: !!expandedClass,
  })

  const gradeCounts = useMemo(() => {
    const map = new Map<number, number>()
    for (const c of classes) {
      map.set(c.grade, (map.get(c.grade) ?? 0) + 1)
    }
    return map
  }, [classes])

  const filteredClasses = useMemo(() => {
    if (selectedGrade === 'all') return classes
    return classes.filter((c) => c.grade === selectedGrade)
  }, [classes, selectedGrade])

  const examTitleMap = useMemo(() => new Map(exams.map((ex) => [ex.id, ex.title])), [exams])

  const gradeAssignments = useMemo(() => {
    if (selectedGrade === 'all') return []
    return assignments.filter((a) => a.target_type === 'grade' && a.target_grade === selectedGrade)
  }, [assignments, selectedGrade])

  const createMutation = useMutation({
    mutationFn: () => createClass(newName.trim(), newGrade, newTeacher || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] })
      setShowCreate(false)
      setNewName('')
      setNewTeacher('')
      setCreateError('')
    },
    onError: (e: Error) => setCreateError(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] })
      if (expandedClass === id) setExpandedClass(null)
      if (settingsClassId === id) setSettingsClassId(null)
    },
    onError: (e: Error) => setFeedbackError(e.message),
  })

  const inviteSettingsMutation = useMutation({
    mutationFn: (vars: {
      classId: string
      opts: Parameters<typeof updateGroupInviteSettings>[1]
    }) => updateGroupInviteSettings(vars.classId, vars.opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] })
      setFeedbackError('')
    },
    onError: (e: Error) => setFeedbackError(e.message),
  })

  const addMutation = useMutation({
    mutationFn: ({ classId, studentId }: { classId: string; studentId: string }) =>
      addStudentToClass(classId, studentId),
    onSuccess: () => {
      setAddStudentId('')
      refetchMembers()
      setFeedbackError('')
    },
    onError: (e: Error) => setFeedbackError(e.message),
  })

  const moveMutation = useMutation({
    mutationFn: ({
      fromClassId,
      toClassId,
      studentId,
    }: {
      fromClassId: string
      toClassId: string
      studentId: string
    }) => moveStudentToClass(fromClassId, toClassId, studentId),
    onSuccess: () => {
      refetchMembers()
      queryClient.invalidateQueries({ queryKey: ['class-members'] })
      setFeedbackError('')
    },
    onError: (e: Error) => setFeedbackError(e.message),
  })

  const assignMutation = useMutation({
    mutationFn: createExamAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-assignments'] })
      setGradeAssignExamId('')
      setGroupAssignExamId('')
      setFeedbackError('')
    },
    onError: (e: Error) => setFeedbackError(e.message),
  })

  const removeAssignmentMutation = useMutation({
    mutationFn: (id: string) => deleteExamAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-assignments'] })
      setFeedbackError('')
    },
    onError: (e: Error) => setFeedbackError(e.message),
  })

  const openSettingsEditor = (group: GroupRecord) => {
    if (settingsClassId === group.id) {
      setSettingsClassId(null)
      return
    }
    setSettingsClassId(group.id)
    setSettingsDraft({
      scheduleNote: group.schedule_note ?? '',
      maxStudents: group.max_students ? String(group.max_students) : '',
      expiresAt: toDatetimeLocalValue(group.invite_expires_at),
    })
  }

  const handleCopyInviteLink = async (group: GroupRecord) => {
    if (!group.invite_code) return
    try {
      await navigator.clipboard.writeText(buildGroupInviteUrl(group.invite_code))
      setCopiedClassId(group.id)
      setTimeout(() => setCopiedClassId((prev) => (prev === group.id ? null : prev)), 2000)
    } catch {
      setFeedbackError('Could not copy invite link automatically. Use the QR Code modal to view it.')
    }
  }

  const handleSaveSettings = (group: GroupRecord) => {
    const parsedMax = settingsDraft.maxStudents.trim()
      ? Number(settingsDraft.maxStudents.trim())
      : null
    if (parsedMax !== null && (!Number.isInteger(parsedMax) || parsedMax < 1)) {
      setFeedbackError('Max students must be a positive whole number or left blank.')
      return
    }
    const isoExpiry = settingsDraft.expiresAt
      ? new Date(settingsDraft.expiresAt).toISOString()
      : null

    inviteSettingsMutation.mutate(
      {
        classId: group.id,
        opts: {
          scheduleNote: settingsDraft.scheduleNote.trim(),
          maxStudents: parsedMax,
          clearMax: parsedMax === null,
          expiresAt: isoExpiry,
          clearExpiry: isoExpiry === null,
        },
      },
      {
        onSuccess: () => setSettingsClassId(null),
      }
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-text">Grades, Groups &amp; Students</h1>
          <p className="text-sm text-text-muted">
            Drill down by Grade → manage Group invite links &amp; capacity → inspect and move individual students.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!showCreate && selectedGrade !== 'all') setNewGrade(selectedGrade)
            setShowCreate(!showCreate)
          }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {showCreate ? 'Cancel' : '+ New Group'}
        </button>
      </div>

      {feedbackError && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          <span>{feedbackError}</span>
          <button
            type="button"
            onClick={() => setFeedbackError('')}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Group Form */}
      {showCreate && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-bold text-text">Create New Group</h2>
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Group name (e.g. Sat/Tue 5PM)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-ink"
            />
            <select
              aria-label="New group grade"
              value={newGrade}
              onChange={(e) => setNewGrade(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-ink"
            >
              {ALL_GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
            <select
              aria-label="New group teacher"
              value={newTeacher}
              onChange={(e) => setNewTeacher(e.target.value)}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-ink"
            >
              <option value="">No teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name ?? t.email}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || createMutation.isPending}
              className="rounded-lg bg-accent-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Group'}
            </button>
          </div>
          {createError && <p className="mt-2 text-sm text-danger">{createError}</p>}
        </div>
      )}

      {/* LEVEL 1: Grade Selector Bar (Grades 1–12) */}
      <div className="mb-5 rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Level 1 · Pick Grade (1–12)
          </span>
          <span className="text-xs text-text-muted">
            {filteredClasses.length} group{filteredClasses.length === 1 ? '' : 's'} shown
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedGrade('all')}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              selectedGrade === 'all'
                ? 'border-brand bg-brand text-white'
                : 'border-border bg-surface text-text hover:border-brand'
            }`}
          >
            All Grades ({classes.length})
          </button>
          {ALL_GRADES.map((g) => {
            const count = gradeCounts.get(g) ?? 0
            const active = selectedGrade === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGrade(g)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-brand bg-brand text-white'
                    : count > 0
                      ? 'border-brand/30 bg-brand/5 text-text hover:border-brand'
                      : 'border-border bg-surface text-text-muted hover:border-brand/50'
                }`}
              >
                G{g}
                {count > 0 ? ` (${count})` : ''}
              </button>
            )
          })}
        </div>

        {/* Grade-level targeted exam/sheet assignment bar when a single Grade is chosen */}
        {selectedGrade !== 'all' && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-text">
                Assign to all Grade {selectedGrade}:
              </span>
              <select
                aria-label={`Assign exam to Grade ${selectedGrade}`}
                value={gradeAssignExamId}
                onChange={(e) => setGradeAssignExamId(e.target.value)}
                className="min-w-[200px] flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink"
              >
                <option value="">Choose exam or practice sheet...</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    [{ex.type === 'practice' ? 'Sheet' : 'Exam'}] {ex.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  assignMutation.mutate({
                    examId: gradeAssignExamId,
                    targetType: 'grade',
                    targetGrade: selectedGrade,
                  })
                }
                disabled={!gradeAssignExamId || assignMutation.isPending}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Assign to Grade {selectedGrade}
              </button>
            </div>
            {gradeAssignments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {gradeAssignments.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs text-text"
                  >
                    {examTitleMap.get(a.exam_id) ?? a.exam_id}
                    <button
                      type="button"
                      onClick={() => removeAssignmentMutation.mutate(a.id)}
                      className="font-bold text-danger hover:underline"
                      aria-label={`Remove Grade ${selectedGrade} assignment`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LEVEL 2: Groups List */}
      <div className="space-y-3">
        {filteredClasses.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
            <p className="text-sm font-medium text-text">
              {selectedGrade === 'all'
                ? 'No groups created yet.'
                : `No groups in Grade ${selectedGrade} yet.`}
            </p>
            <button
              type="button"
              onClick={() => {
                if (selectedGrade !== 'all') setNewGrade(selectedGrade)
                setShowCreate(true)
              }}
              className="mt-3 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white"
            >
              + Create {selectedGrade === 'all' ? 'First Group' : `Grade ${selectedGrade} Group`}
            </button>
          </div>
        )}

        {filteredClasses.map((group) => {
          const isExpanded = expandedClass === group.id
          const isEditingSettings = settingsClassId === group.id
          const groupAssignments = assignments.filter(
            (a) => a.target_type === 'group' && a.target_group_id === group.id
          )
          const otherGroups = classes.filter((c) => c.id !== group.id)

          return (
            <div key={group.id} className="rounded-xl border border-border bg-surface">
              {/* Group Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedClass(isExpanded ? null : group.id)
                    setAddStudentId('')
                  }}
                  className="flex flex-1 flex-wrap items-center gap-2 text-left"
                >
                  <span className="font-bold text-text">{group.name}</span>
                  <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                    Grade {group.grade}
                  </span>
                  <span className="text-xs text-text-muted">
                    {group.profiles?.full_name ?? 'No teacher'}
                  </span>
                  {group.schedule_note && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                      {group.schedule_note}
                    </span>
                  )}
                  {group.max_students && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                      Max {group.max_students}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      group.invite_enabled
                        ? 'bg-accent-green/15 text-accent-green'
                        : 'bg-surface-alt text-text-muted'
                    }`}
                  >
                    {group.invite_enabled ? 'Invite Open' : 'Invite Locked'}
                  </span>
                </button>

                {/* Group Quick Actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      inviteSettingsMutation.mutate({
                        classId: group.id,
                        opts: { inviteEnabled: !group.invite_enabled },
                      })
                    }
                    disabled={inviteSettingsMutation.isPending}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      group.invite_enabled
                        ? 'border-amber-500/40 text-amber-700 hover:bg-amber-500/10'
                        : 'border-accent-green/40 text-accent-green hover:bg-accent-green/10'
                    }`}
                  >
                    {group.invite_enabled ? 'Lock Invite' : 'Unlock Invite'}
                  </button>

                  {group.invite_code && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopyInviteLink(group)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text hover:border-brand hover:text-brand"
                      >
                        {copiedClassId === group.id ? 'Copied!' : 'Copy Invite Link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrGroup(group)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text hover:border-brand hover:text-brand"
                      >
                        QR Code
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => openSettingsEditor(group)}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text-muted hover:border-brand hover:text-brand"
                  >
                    {isEditingSettings ? 'Close Settings' : 'Settings'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExpandedClass(isExpanded ? null : group.id)
                      setAddStudentId('')
                    }}
                    className="rounded-lg bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand/20"
                  >
                    {isExpanded ? 'Hide Students' : 'Students'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete group "${group.name}"?`)) {
                        deleteMutation.mutate(group.id)
                      }
                    }}
                    className="px-1.5 py-1 text-xs font-semibold text-danger hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Inline Invite, Schedule & Capacity Settings Panel */}
              {isEditingSettings && (
                <div className="border-t border-border bg-surface-alt/40 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Invite Link &amp; Capacity Settings · Code:{' '}
                      <span className="font-mono text-text">{group.invite_code ?? 'None'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            'Rotate this group invite code? The previous link will stop working immediately.'
                          )
                        ) {
                          inviteSettingsMutation.mutate({
                            classId: group.id,
                            opts: { rotateCode: true },
                          })
                        }
                      }}
                      disabled={inviteSettingsMutation.isPending}
                      className="rounded-lg border border-amber-500/40 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-500/10"
                    >
                      Rotate Code
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-muted">
                        Schedule Note
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sat & Tue 5:00 PM"
                        value={settingsDraft.scheduleNote}
                        onChange={(e) =>
                          setSettingsDraft((d) => ({ ...d, scheduleNote: e.target.value }))
                        }
                        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-muted">
                        Max Students (blank = unlimited)
                      </label>
                      <input
                        type="number"
                        min={1}
                        placeholder="Unlimited"
                        value={settingsDraft.maxStudents}
                        onChange={(e) =>
                          setSettingsDraft((d) => ({ ...d, maxStudents: e.target.value }))
                        }
                        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-muted">
                        Invite Expires At (blank = never)
                      </label>
                      <input
                        type="datetime-local"
                        value={settingsDraft.expiresAt}
                        onChange={(e) =>
                          setSettingsDraft((d) => ({ ...d, expiresAt: e.target.value }))
                        }
                        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSettingsClassId(null)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveSettings(group)}
                      disabled={inviteSettingsMutation.isPending}
                      className="rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {inviteSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              )}

              {/* LEVEL 3: Expanded Group → Assignments & Student Roster */}
              {isExpanded && (
                <div className="border-t border-border p-4">
                  {/* Targeted Group Assignment */}
                  <div className="mb-4 rounded-xl border border-border bg-surface-alt/30 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-text">
                        Assign Exam/Sheet to {group.name}:
                      </span>
                      <select
                        aria-label={`Assign exam to ${group.name}`}
                        value={groupAssignExamId}
                        onChange={(e) => setGroupAssignExamId(e.target.value)}
                        className="min-w-[200px] flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink"
                      >
                        <option value="">Choose exam or practice sheet...</option>
                        {exams.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            [{ex.type === 'practice' ? 'Sheet' : 'Exam'}] {ex.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          assignMutation.mutate({
                            examId: groupAssignExamId,
                            targetType: 'group',
                            targetGroupId: group.id,
                          })
                        }
                        disabled={!groupAssignExamId || assignMutation.isPending}
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Assign to Group
                      </button>
                    </div>
                    {groupAssignments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {groupAssignments.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-xs text-text"
                          >
                            {examTitleMap.get(a.exam_id) ?? a.exam_id}
                            <button
                              type="button"
                              onClick={() => removeAssignmentMutation.mutate(a.id)}
                              className="font-bold text-danger hover:underline"
                              aria-label="Remove group assignment"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Student Roster */}
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Level 3 · Students ({members.length}
                      {group.max_students ? ` / ${group.max_students}` : ''})
                    </h3>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    <select
                      aria-label="Select student to add"
                      value={addStudentId}
                      onChange={(e) => setAddStudentId(e.target.value)}
                      className="min-w-[220px] flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink"
                    >
                      <option value="">Select student to add...</option>
                      {students
                        .filter((s: any) => !members.find((m: any) => m.student_id === s.id))
                        .map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name
                              ? `${s.full_name} (Email: ${s.email})`
                              : `Email: ${s.email}`}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (addStudentId) {
                          addMutation.mutate({ classId: group.id, studentId: addStudentId })
                        }
                      }}
                      disabled={!addStudentId || addMutation.isPending}
                      className="rounded-lg bg-accent-green px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Add Student
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {members.map((m: any) => (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                      >
                        <StudentIdentity
                          name={m.profiles?.full_name}
                          email={m.profiles?.email}
                          compact
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          {otherGroups.length > 0 && (
                            <select
                              aria-label={`Move ${m.profiles?.full_name || m.profiles?.email || 'student'} to another group`}
                              defaultValue=""
                              onChange={(e) => {
                                const targetId = e.target.value
                                if (!targetId) return
                                moveMutation.mutate({
                                  fromClassId: group.id,
                                  toClassId: targetId,
                                  studentId: m.student_id,
                                })
                                e.target.value = ''
                              }}
                              disabled={moveMutation.isPending}
                              className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-ink"
                            >
                              <option value="">Move to group...</option>
                              {otherGroups.map((og) => (
                                <option key={og.id} value={og.id}>
                                  G{og.grade} · {og.name}
                                </option>
                              ))}
                            </select>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setInspectedStudent({
                                id: m.student_id,
                                full_name: m.profiles?.full_name ?? null,
                                email: m.profiles?.email ?? null,
                                grade: group.grade,
                                groupName: group.name,
                              })
                            }
                            className="rounded-lg border border-brand/40 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                          >
                            Inspect &amp; Assign
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeStudentFromClass(group.id, m.student_id).then(() =>
                                refetchMembers()
                              )
                            }
                            className="text-xs font-semibold text-danger hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-text-muted">
                        No students in this group yet. Share the invite link or add a student above.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* QR Code Modal */}
      {qrGroup && qrGroup.invite_code && (
        <GroupInviteQrModal
          groupName={qrGroup.name}
          grade={qrGroup.grade}
          inviteCode={qrGroup.invite_code}
          scheduleNote={qrGroup.schedule_note}
          onClose={() => setQrGroup(null)}
        />
      )}

      {/* Single-Student Inspector Modal */}
      {inspectedStudent && (
        <StudentInspectorModal
          student={inspectedStudent}
          exams={exams}
          onClose={() => setInspectedStudent(null)}
        />
      )}
    </div>
  )
}
