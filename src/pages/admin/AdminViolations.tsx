import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function AdminViolations() {
  const { data: violations } = useQuery({
    queryKey: ['admin-violations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`*, profile:profiles!user_id(full_name, email), exam:exams(title)`)
        .eq('action', 'violation')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data ?? []
    },
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text text-danger">Cheat Violations</h1>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-text-muted"><tr>
            <th className="px-4 py-3">Student</th><th className="px-4 py-3">Exam</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">When</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {(!violations || violations.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">No violations recorded</td></tr>
            )}
            {violations?.map((v: any) => (
              <tr key={v.id} className="text-text hover:bg-danger/5">
                <td className="px-4 py-3">{v.profile?.full_name || v.profile?.email || '—'}</td>
                <td className="px-4 py-3">{v.exam?.title || '—'}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-danger/10 px-2 py-0.5 text-xs text-danger">
                    {v.details?.type || 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-muted">{new Date(v.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
