import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function AdminExams() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')

  const { data: exams } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from('exams').update({ is_published }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-exams'] }),
  })

  const deleteExam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exams').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-exams'] }),
  })

  const filtered = (exams ?? []).filter(e => !typeFilter || e.type === typeFilter)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Exams</h1>
      <div className="mb-4 flex gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-ink">
          <option value="">All types</option>
          <option value="exam">Exam</option>
          <option value="practice">Practice</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-text-muted"><tr>
            <th className="px-4 py-3">Title</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Pass %</th><th className="px-4 py-3">Published</th><th className="px-4 py-3">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map(e => (
              <tr key={e.id} className="text-text hover:bg-surface/50">
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs ${e.type === 'exam' ? 'bg-accent-gold/10 text-accent-gold' : 'bg-accent-green/10 text-accent-green'}`}>{e.type}</span></td>
                <td className="px-4 py-3">{e.type === 'exam' ? `${e.time_limit_minutes} min` : '-'}</td>
                <td className="px-4 py-3">{e.type === 'exam' ? `${e.passing_score}%` : '-'}</td>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={e.is_published} onChange={() => togglePublished.mutate({ id: e.id, is_published: !e.is_published })} className="h-4 w-4 accent-brand" />
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => { if (confirm('Delete this exam?')) deleteExam.mutate(e.id) }} className="text-xs text-danger hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
