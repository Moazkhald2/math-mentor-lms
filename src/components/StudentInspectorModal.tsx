import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import StudentIdentity from './StudentIdentity'
import { fetchStudentRecentAttempts, resetStudentAttempt } from '../lib/classes'
import { createExamAssignment, deleteExamAssignment, fetchExamAssignments } from '../lib/groups'
import type { Exam } from '../types'

export interface InspectedStudent {
  id: string
  full_name: string | null
  email: string | null
  grade?: number | null
  groupName?: string | null
}

interface StudentInspectorModalProps {
  student: InspectedStudent
  exams: Exam[]
  onClose: () => void
}

export default function StudentInspectorModal({
  student,
  exams,
  onClose,
}: StudentInspectorModalProps) {
  const queryClient = useQueryClient()
  const [selectedExamId, setSelectedExamId] = useState('')
  const [actionError, setActionError] = useState('')

  const { data: attempts = [], isLoading: loadingAttempts } = useQuery({
    queryKey: ['student-attempts', student.id],
    queryFn: () => fetchStudentRecentAttempts(student.id),
  })

  const { data: allAssignments = [] } = useQuery({
    queryKey: ['exam-assignments'],
    queryFn: () => fetchExamAssignments(),
  })

  const studentAssignments = allAssignments.filter(
    (a) => a.target_type === 'student' && a.target_student_id === student.id
  )

  const assignMutation = useMutation({
    mutationFn: () =>
      createExamAssignment({
        examId: selectedExamId,
        targetType: 'student',
        targetStudentId: student.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-assignments'] })
      setSelectedExamId('')
      setActionError('')
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const removeAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => deleteExamAssignment(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-assignments'] })
      setActionError('')
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const resetMutation = useMutation({
    mutationFn: (attemptId: string) => resetStudentAttempt(attemptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-attempts', student.id] })
      setActionError('')
    },
    onError: (e: Error) => setActionError(e.message),
  })

  const examTitleMap = new Map(exams.map((ex) => [ex.id, ex.title]))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Inspect student ${student.full_name || student.email || ''}`}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
          <StudentIdentity
            name={student.full_name}
            email={student.email}
            grade={student.grade}
            groupName={student.groupName}
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text"
          >
            Close
          </button>
        </div>

        {actionError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {actionError}
          </div>
        )}

        {/* Section 1: Targeted Exam / Sheet Assignment for this Single Student */}
        <div className="mb-6 rounded-xl border border-border bg-surface-alt/40 p-4">
          <h3 className="mb-2 text-sm font-bold text-text">
            Targeted Exams &amp; Practice Sheets (Single Student)
          </h3>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Select exam or sheet for student"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink"
            >
              <option value="">Choose an exam or practice sheet...</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  [{ex.type === 'practice' ? 'Sheet' : 'Exam'}] {ex.title}
                  {ex.grade ? ` (G${ex.grade})` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => assignMutation.mutate()}
              disabled={!selectedExamId || assignMutation.isPending}
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign to Student'}
            </button>
          </div>

          <div className="mt-3 space-y-1.5">
            {studentAssignments.length === 0 ? (
              <p className="text-xs text-text-muted">
                No individual assignments yet. This student still receives Grade &amp; Group assignments.
              </p>
            ) : (
              studentAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                >
                  <span className="font-medium text-text">
                    {examTitleMap.get(a.exam_id) ?? a.exam_id}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAssignmentMutation.mutate(a.id)}
                    disabled={removeAssignmentMutation.isPending}
                    className="font-semibold text-danger hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Recent Attempts & Attempt Reset */}
        <div>
          <h3 className="mb-2 text-sm font-bold text-text">
            Recent Attempts &amp; Reset
          </h3>
          {loadingAttempts ? (
            <p className="text-xs text-text-muted">Loading attempts...</p>
          ) : attempts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-text-muted">
              No exam or practice attempts recorded for this student yet.
            </p>
          ) : (
            <div className="space-y-2">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <p className="font-semibold text-text">
                      {att.exams?.title ?? examTitleMap.get(att.exam_id) ?? 'Assessment'}
                      {att.attempt_number ? ` · Attempt #${att.attempt_number}` : ''}
                    </p>
                    <p className="text-text-muted">
                      Status: <span className="font-medium">{att.status}</span>
                      {att.score !== null && att.total_points
                        ? ` · Score: ${att.score}/${att.total_points}`
                        : ''}
                      {' · '}
                      {new Date(att.started_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          'Reset this attempt? The student will be able to take it again and this attempt record will be removed.'
                        )
                      ) {
                        resetMutation.mutate(att.id)
                      }
                    }}
                    disabled={resetMutation.isPending}
                    className="rounded-lg border border-danger/40 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50"
                  >
                    Reset Attempt
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
