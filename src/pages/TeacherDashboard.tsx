import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function TeacherDashboard() {
  const { user } = useAuth()

  const { data: exams } = useQuery<any[]>({
    queryKey: ['teacher-exams', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('exams').select('id, title, type, is_published, grade').eq('created_by', user!.id).order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!user,
  })

  const { data: stats } = useQuery<{ total: number; avgScore: number } | null>({
    queryKey: ['teacher-stats', user?.id, exams?.length],
    queryFn: async () => {
      const ids = (exams ?? []).map((e: any) => e.id)
      if (!ids.length) return null
      const { data } = await supabase.from('exam_attempts').select('score').in('exam_id', ids).eq('status', 'completed')
      const total = data?.length ?? 0
      const avgScore = total ? Math.round(data!.reduce((s: number, a: any) => s + (a.score ?? 0), 0) / total) : 0
      return { total, avgScore }
    },
    enabled: !!exams && exams.length > 0,
  })

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black text-text">Teacher Dashboard</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand/40 bg-surface p-5">
          <span className="rounded bg-brand/20 px-2 py-0.5 text-xs font-semibold text-brand">My Exams</span>
          <p className="mt-2 text-3xl font-black text-text">{exams?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-accent-green/40 bg-surface p-5">
          <span className="rounded bg-accent-green/20 px-2 py-0.5 text-xs font-semibold text-accent-green">Total Attempts</span>
          <p className="mt-2 text-3xl font-black text-text">{stats?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border border-accent-gold/40 bg-surface p-5">
          <span className="rounded bg-accent-gold/20 px-2 py-0.5 text-xs font-semibold text-accent-gold">Avg Score</span>
          <p className="mt-2 text-3xl font-black text-text">{stats?.avgScore ?? 0}%</p>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold text-text">My Exams</h2>
      {(!exams || exams.length === 0) && <p className="text-text-muted">You haven't created any exams yet.</p>}
      <div className="space-y-2">
        {exams?.map((e: any) => (
          <div key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
            <div>
              <p className="font-medium text-text">{e.title}</p>
              <p className="text-xs text-text-muted">{e.type} · {e.grade ? `Grade ${e.grade}` : 'All grades'} · {e.is_published ? 'Published' : 'Draft'}</p>
            </div>
            <a href={`/admin/exams`} className="text-sm text-brand hover:underline">Manage</a>
          </div>
        ))}
      </div>
    </div>
  )
}
