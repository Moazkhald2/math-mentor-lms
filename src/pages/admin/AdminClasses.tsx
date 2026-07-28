import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchClasses, createClass, deleteClass, fetchClassMembers, addStudentToClass, removeStudentFromClass, fetchAvailableStudents, fetchAvailableTeachers } from '../../lib/classes'

export default function AdminClasses() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState<number>(3)
  const [newTeacher, setNewTeacher] = useState('')
  const [expandedClass, setExpandedClass] = useState<string | null>(null)

  const { data: classes } = useQuery({ queryKey: ['admin-classes'], queryFn: fetchClasses })
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: fetchAvailableTeachers })
  const { data: students } = useQuery({ queryKey: ['students'], queryFn: fetchAvailableStudents })
  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ['class-members', expandedClass],
    queryFn: () => fetchClassMembers(expandedClass!),
    enabled: !!expandedClass,
  })

  const createMutation = useMutation({
    mutationFn: () => createClass(newName, newGrade, newTeacher || undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-classes'] }); setShowCreate(false); setNewName(''); setNewGrade(3); setNewTeacher('') },
  })

  const addMutation = useMutation({
    mutationFn: ({ studentId }: { studentId: string }) => addStudentToClass(expandedClass!, studentId),
    onSuccess: () => refetchMembers(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-classes'] }),
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-text">Classes</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
          {showCreate ? 'Cancel' : '+ New Class'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 font-bold text-text">Create Class</h2>
          <div className="flex gap-3">
            <input placeholder="Class name" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 rounded-lg border border-border bg-white px-4 py-2 text-text" />
            <select value={newGrade} onChange={e => setNewGrade(Number(e.target.value))} className="rounded-lg border border-border bg-white px-4 py-2 text-text">
              {Array.from({ length: 10 }, (_, i) => i + 3).map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <select value={newTeacher} onChange={e => setNewTeacher(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-text">
              <option value="">No teacher</option>
              {teachers?.map(t => <option key={t.id} value={t.id}>{t.full_name ?? t.email}</option>)}
            </select>
            <button onClick={() => createMutation.mutate()} disabled={!newName} className="rounded-lg bg-accent-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {classes?.map((c: any) => (
          <div key={c.id} className="rounded-xl border border-border bg-surface">
            <button onClick={() => setExpandedClass(expandedClass === c.id ? null : c.id)} className="flex w-full items-center justify-between p-4 text-left">
              <div>
                <span className="font-bold text-text">{c.name}</span>
                <span className="ml-3 text-sm text-text-muted">Grade {c.grade}</span>
                <span className="ml-3 text-sm text-text-muted">{c.profiles?.full_name ?? 'No teacher'}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete class?')) deleteMutation.mutate(c.id) }} className="text-xs text-danger hover:underline">Delete</button>
              </div>
            </button>

            {expandedClass === c.id && (
              <div className="border-t border-border p-4">
                <h3 className="mb-3 text-sm font-bold text-text-muted uppercase">Students</h3>
                <div className="mb-3 flex gap-2">
                  <select id="add-student-select" className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text" defaultValue="">
                    <option value="" disabled>Select student to add...</option>
                    {students?.filter((s: any) => !members?.find((m: any) => m.student_id === s.id)).map((s: any) => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
                  </select>
                  <button onClick={() => {
                    const sel = document.getElementById('add-student-select') as HTMLSelectElement
                    if (sel.value) addMutation.mutate({ studentId: sel.value })
                  }} className="rounded-lg bg-accent-green px-3 py-1.5 text-sm text-white">Add</button>
                </div>
                <div className="space-y-1">
                  {members?.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                      <span className="text-text">{m.profiles?.full_name ?? m.profiles?.email}</span>
                      <button onClick={() => removeStudentFromClass(expandedClass!, m.student_id).then(() => refetchMembers())} className="text-xs text-danger hover:underline">Remove</button>
                    </div>
                  ))}
                  {members?.length === 0 && <p className="text-sm text-text-muted">No students in this class</p>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
