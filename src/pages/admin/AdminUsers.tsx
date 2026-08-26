import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { GRADES } from '../../components/ui/filters'

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [gradeSel, setGradeSel] = useState<number | ''>('')
  const [classSel, setClassSel] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
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
    staleTime: 5 * 60 * 1000,
  })

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('profiles').delete().eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const filtered = (users ?? []).filter(u => {
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
      <h1 className="mb-6 text-2xl font-black text-text">Users</h1>

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              ✕
            </button>
          )}
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-ink">
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <select
          aria-label="Filter by grade"
          className="input min-w-[130px]"
          value={gradeSel}
          onChange={(e) => { setGradeSel(e.target.value ? Number(e.target.value) : ''); setClassSel('') }}
        >
          <option value="">All grades</option>
          {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <select
          aria-label="Filter by class"
          className="input min-w-[130px]"
          value={classSel}
          onChange={(e) => setClassSel(e.target.value)}
        >
          <option value="">All classes</option>
          {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(gradeSel !== '' || classSel) && (
          <button
            onClick={() => { setGradeSel(''); setClassSel('') }}
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
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Class Code</th>
              <th className="px-4 py-3">Parent Phone</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => (
              <tr key={u.id} className="text-text hover:bg-surface/50">
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.full_name}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })}
                    disabled={updateRole.isPending}
                    className="rounded border border-border bg-white px-2 py-1 text-xs text-ink"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">{u.grade ?? '-'}</td>
                <td className="px-4 py-3">{u.class_code ?? '-'}</td>
                <td className="px-4 py-3 text-xs">{u.parent_phone ? u.parent_phone.slice(0, 3) + '...' + u.parent_phone.slice(-3) : 'N/A'}</td>
                <td className="px-4 py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
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
    </div>
  )
}
