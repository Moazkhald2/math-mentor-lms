import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const filtered = (users ?? []).filter((u) => {
    if (search && !u.email?.toLowerCase().includes(search.toLowerCase()) && !u.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter && u.role !== roleFilter) return false
    return true
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Users</h1>

      <div className="mb-4 flex gap-3">
        <input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-white px-4 py-2 text-text"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-text">
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
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
                    className="rounded border border-border bg-white px-2 py-1 text-xs"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">{u.grade ?? '-'}</td>
                <td className="px-4 py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { if (confirm('Delete this user?')) supabase.from('profiles').delete().eq('id', u.id).then(() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })) }}
                    className="text-xs text-danger hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}