import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { ExamAttempt } from '../types'

export default function Profile() {
  const { user } = useAuth()

  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      return data as { full_name: string; email: string; grade: number | null; class_code: string | null; parent_phone: string; telegram_chat_id: string; role: string }
    },
    enabled: !!user,
  })

  const { data: myClass } = useQuery({
    queryKey: ['my-class', profile?.class_code],
    queryFn: async () => {
      if (!profile?.class_code) return null
      const { data } = await supabase.from('classes').select('name').eq('code', profile.class_code).single()
      return data as { name: string } | null
    },
    enabled: !!profile?.class_code,
  })

  const { data: attempts } = useQuery({
    queryKey: ['my-attempts', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase.from('exam_attempts').select('*').eq('user_id', user.id).eq('status', 'completed')
      return (data ?? []) as ExamAttempt[]
    },
    enabled: !!user,
  })

  const { data: recentExams } = useQuery({
    queryKey: ['my-recent-exams', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase
        .from('exam_attempts')
        .select('*, exam:exams(title, type)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20)
      return (data ?? []) as (ExamAttempt & { exam: { title: string; type: string } })[]
    },
    enabled: !!user,
  })

  if (!user || !profile) return <p className="text-text-muted">Loading...</p>

  const avgScore = attempts && attempts.length > 0
    ? Math.round(attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length)
    : 0
  const practiceCount = attempts?.filter(a => a.total_points > 0).length ?? 0

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-3xl font-black text-text">My Profile</h1>

      <div className="mb-8 rounded-xl border border-border bg-surface p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-black text-white">
            {(profile.full_name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">{profile.full_name || 'User'}</h2>
            <p className="text-sm text-text-muted">{profile.email || user.email}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-xs text-text-muted">Grade</span>
            <p className="font-semibold text-text">{profile.grade ? `Grade ${profile.grade}` : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Class</span>
            <p className="font-semibold text-text">{myClass?.name || profile.class_code || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Parent Phone</span>
            <p className="font-semibold text-text">{profile.parent_phone || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Telegram Reports</span>
            <p className="font-semibold text-text">{profile.telegram_chat_id ? '✅ Active' : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Role</span>
            <p className="font-semibold text-text capitalize">{profile.role}</p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-brand/40 bg-surface p-5 text-center">
          <p className="text-3xl font-black text-brand">{attempts?.length ?? 0}</p>
          <p className="mt-1 text-sm text-text-muted">Exams Taken</p>
        </div>
        <div className="rounded-xl border border-accent-green/40 bg-surface p-5 text-center">
          <p className="text-3xl font-black text-accent-green">{avgScore}%</p>
          <p className="mt-1 text-sm text-text-muted">Avg Score</p>
        </div>
        <div className="rounded-xl border border-accent-gold/40 bg-surface p-5 text-center">
          <p className="text-3xl font-black text-accent-gold">{practiceCount}</p>
          <p className="mt-1 text-sm text-text-muted">Practice Sessions</p>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold text-text">Exam History</h2>
      {recentExams && recentExams.length === 0 && (
        <p className="mb-6 text-sm text-text-muted">No exams attempted yet.</p>
      )}
      <div className="mb-6 space-y-2">
        {recentExams?.map(a => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-text">{a.exam?.title || 'Exam'}</p>
              <p className="text-xs text-text-muted">
                {new Date(a.started_at).toLocaleDateString()} · {a.exam?.type === 'practice' ? 'Practice' : 'Exam'}
              </p>
            </div>
            {a.status === 'completed' ? (
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className={`text-lg font-bold ${(a.score ?? 0) >= 60 ? 'text-accent-green' : 'text-danger'}`}>{a.score}%</span>
                <a href={`/results/${a.id}`} className="text-sm text-brand hover:underline">Review</a>
              </div>
            ) : (
              <span className="text-sm text-text-muted shrink-0 ml-3">{a.status}</span>
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <a href="/settings" className="text-sm text-brand hover:underline">Edit Settings →</a>
      </div>
    </div>
  )
}
