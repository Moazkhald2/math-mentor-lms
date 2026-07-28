import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { ExamAttempt } from '../types'

export default function Dashboard() {
  const { user } = useAuth()

  const { data: attempts } = useQuery({
    queryKey: ['my-attempts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*, exam:exams(title)')
        .eq('user_id', user!.id)
        .order('started_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data as (ExamAttempt & { exam: { title: string } })[]
    },
    enabled: !!user,
  })

  const completedAttempts = attempts?.filter((a) => a.status === 'completed') ?? []
  const avgScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / completedAttempts.length)
    : 0

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-surface p-12 text-center">
        <p className="text-lg text-text-muted">Sign in to see your dashboard</p>
        <a
          href="/login"
          className="mt-4 inline-block rounded-lg bg-brand px-6 py-2 text-white"
        >
          Sign In
        </a>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text">Dashboard</h1>
        <p className="mt-1 text-text-muted">Welcome back, {user.user_metadata.full_name}</p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-6">
          <p className="text-sm text-brand">Exams Taken</p>
          <p className="mt-1 text-3xl font-black text-text">{completedAttempts.length}</p>
        </div>
        <div className="rounded-xl border border-accent-green/30 bg-accent-green/5 p-6">
          <p className="text-sm text-accent-green">Average Score</p>
          <p className="mt-1 text-3xl font-black text-text">{avgScore}%</p>
        </div>
        <div className="rounded-xl border border-accent-gold/30 bg-accent-gold/5 p-6">
          <p className="text-sm text-accent-gold">In Progress</p>
          <p className="mt-1 text-3xl font-black text-text">
            {attempts?.filter((a) => a.status === 'in_progress').length ?? 0}
          </p>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold text-text">Recent Attempts</h2>

      {attempts && attempts.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-text-muted">No exams attempted yet</p>
          <a
            href="/exams"
            className="mt-3 inline-block text-sm text-brand hover:underline"
          >
            Browse exams →
          </a>
        </div>
      )}

      <div className="space-y-3">
        {attempts?.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
          >
            <div>
              <p className="font-medium text-text">{a.exam?.title ?? 'Exam'}</p>
              <p className="text-xs text-text-muted">
                {new Date(a.started_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {a.status === 'completed' ? (
                <>
                  <span className={`text-lg font-bold ${(a.score ?? 0) >= 60 ? 'text-accent-green' : 'text-danger'}`}>
                    {a.score}%
                  </span>
                  <a
                    href={`/results/${a.id}`}
                    className="text-sm text-brand hover:underline"
                  >
                    Review
                  </a>
                </>
              ) : a.status === 'in_progress' ? (
                <span className="text-sm text-accent-gold">In Progress</span>
              ) : (
                <span className="text-sm text-text-muted">Abandoned</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
