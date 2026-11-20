import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { fetchExams } from '../../lib/exams'
import { fetchClasses } from '../../lib/classes'
import { ALL_GRADES } from '../../lib/grades'
import StudentIdentity from '../../components/StudentIdentity'
import StudentInspectorModal, { type InspectedStudent } from '../../components/StudentInspectorModal'

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [gradeSel, setGradeSel] = useState<number | ''>('')
  const [classSel, setClassSel] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [inspectedStudent, setInspectedStudent] = useState<InspectedStudent | null>(null)
  const [promoteCandidateId, setPromoteCandidateId] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', debouncedSearch, roleFilter],
    queryFn: async () => {
      let q = supabase.from('profiles').select('*')
      if (debouncedSearch) {
        q = q.or(`email.ilike.%${debouncedSearch}%,full_name.ilike.%${debouncedSearch}%`)
      }
      if (roleFilter) {
        q = q.eq('role', roleFilter)
      }
      const { data, error } = await q.order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    staleTime: 60 * 1000,
  })

  const { data: exams = [] } = useQuery({
    queryKey: ['admin-exams-list'],
    queryFn: fetchExams,
  })

  const { data: allClasses = [] } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: fetchClasses,
  })

  const teacherClassesMap = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; grade: number }>>()
    for (const c of allClasses as Array<{ id: string; name: string; grade: number; teacher_id?: string | null }>) {
      if (!c.teacher_id) continue
      const list = map.get(c.teacher_id) ?? []
      list.push({ id: c.id, name: c.name, grade: c.grade })
      map.set(c.teacher_id, list)
    }
    return map
  }, [allClasses])

  const currentTeachers = useMemo(
    () => (users ?? []).filter((u) => u.role === 'teacher' || u.role === 'admin'),
    [users]
  )

  const promotableStudents = useMemo(
    () => (users ?? []).filter((u) => u.role === 'student'),
    [users]
  )

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const updateGrade = useMutation({
    mutationFn: async ({ id, grade }: { id: string; grade: number | null }) => {
      const { error } = await supabase.from('profiles').update({ grade }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const filtered = (users ?? []).filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false
    if (gradeSel !== '' && u.grade !== gradeSel) return false
    if (classSel && u.class_code !== classSel) return false
    return true
  })

  const classOptions = useMemo(() => {
    const codes = new Set<string>()
    for (const u of users ?? []) {
      if ((!gradeSel || u.grade === gradeSel) && u.class_code) codes.add(u.class_code)
    }
    return [...codes].sort()
  }, [users, gradeSel])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Users &amp; Teachers</h1>
          <p className="text-sm text-text-muted">
            Promote teachers, manage Grades 1–12, or inspect individual student attempts and assignments.
          </p>
        </div>
        <Link
          to="/admin/classes"
          className="rounded-lg border border-brand/40 bg-brand/5 px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/10"
        >
          Manage Grades &amp; Groups →
        </Link>
      </div>

      {/* Teachers & Multi-Grade Assignment Quick Panel */}
      <section className="mb-6 rounded-2xl border border-brand/25 bg-surface p-5 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-ink">Add or Assign a Teacher</h2>
            <p className="text-xs text-text-muted">
              Have your teacher register at <code className="rounded bg-paper px-1.5 py-0.5">/register</code>, then promote them to <strong>Teacher</strong> below. One teacher can teach multiple classes and grades via{' '}
              <Link to="/admin/classes" className="font-semibold text-brand hover:underline">
                Grades &amp; Groups
              </Link>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select user to promote to teacher"
              value={promoteCandidateId}
              onChange={(e) => setPromoteCandidateId(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink"
            >
              <option value="">Choose registered user...</option>
              {promotableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email} ({s.email})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!promoteCandidateId || updateRole.isPending}
              onClick={() => {
                if (!promoteCandidateId) return
                updateRole.mutate(
                  { id: promoteCandidateId, role: 'teacher' },
                  {
                    onSuccess: () => {
                      setPromoteCandidateId('')
                      queryClient.invalidateQueries({ queryKey: ['teachers'] })
                    },
                  }
                )
              }}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-light disabled:opacity-50"
            >
              + Promote to Teacher
            </button>
          </div>
        </div>

        {currentTeachers.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-3">
            {currentTeachers.map((t) => {
              const assigned = teacherClassesMap.get(t.id) ?? []
              return (
                <div
                  key={t.id}
                  className="rounded-xl border border-border bg-paper px-3 py-2 text-xs dark:bg-tertiary/40"
                >
                  <p className="font-bold text-ink">
                    {t.full_name || t.email}{' '}
                    <span className="ml-1 rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand">
                      {t.role}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    {assigned.length > 0
                      ? assigned.map((c) => `G${c.grade} · ${c.name}`).join(', ')
                      : 'No groups assigned yet — assign in Grades & Groups'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-ink"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              ✕
            </button>
          )}
        </div>
        <select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-ink"
        >
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <select
          aria-label="Filter by grade"
          className="input min-w-[130px]"
          value={gradeSel}
          onChange={(e) => {
            setGradeSel(e.target.value ? Number(e.target.value) : '')
            setClassSel('')
          }}
        >
          <option value="">All grades</option>
          {ALL_GRADES.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by class"
          className="input min-w-[130px]"
          value={classSel}
          onChange={(e) => setClassSel(e.target.value)}
        >
          <option value="">All classes</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {(gradeSel !== '' || classSel) && (
          <button
            type="button"
            onClick={() => {
              setGradeSel('')
              setClassSel('')
            }}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-brand hover:text-brand"
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {isLoading && <p className="text-text-muted">Loading...</p>}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-text-muted">
            <tr>
              <th className="px-4 py-3">Real Name &amp; Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Group / Class</th>
              <th className="px-4 py-3">Parent Phone</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => (
              <tr key={u.id} className="text-text hover:bg-surface/50">
                <td className="px-4 py-3">
                  <StudentIdentity name={u.full_name} email={u.email} compact />
                </td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`Role for ${u.full_name || u.email}`}
                    value={u.role}
                    onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })}
                    disabled={updateRole.isPending}
                    className="rounded border border-border bg-surface px-2 py-1 text-xs text-ink"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`Grade for ${u.full_name || u.email}`}
                    value={u.grade ?? ''}
                    onChange={(e) =>
                      updateGrade.mutate({
                        id: u.id,
                        grade: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    disabled={updateGrade.isPending}
                    className="rounded border border-border bg-surface px-2 py-1 text-xs text-ink"
                  >
                    <option value="">-</option>
                    {ALL_GRADES.map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">{u.class_code ?? '-'}</td>
                <td className="px-4 py-3 text-xs">
                  {u.parent_phone
                    ? u.parent_phone.slice(0, 3) + '...' + u.parent_phone.slice(-3)
                    : 'N/A'}
                </td>
                <td className="px-4 py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.role === 'student' && (
                      <button
                        type="button"
                        onClick={() =>
                          setInspectedStudent({
                            id: u.id,
                            full_name: u.full_name,
                            email: u.email,
                            grade: u.grade,
                            groupName: u.class_code,
                          })
                        }
                        className="rounded border border-brand/40 px-2 py-0.5 text-xs font-semibold text-brand hover:bg-brand/10"
                      >
                        Inspect
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Delete this user and all their data?')) {
                          deleteUser.mutate(u.id)
                        }
                      }}
                      disabled={deleteUser.isPending}
                      className="text-xs text-danger hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !isLoading && (
          <div className="p-8 text-center text-text-muted">
            {debouncedSearch ? 'No users found matching your search.' : 'No users available.'}
          </div>
        )}
      </div>

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
