import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fetchActivityLogs } from '../lib/activity'
import type { ExamAttempt } from '../types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)

  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase.from('profiles').select('grade, role').eq('id', user.id).single()
      return data as { grade: number | null; role: string } | null
    },
    enabled: !!user,
  })

  const updateGrade = useMutation({
    mutationFn: async (grade: number) => {
      const { error } = await supabase.from('profiles').update({ grade }).eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      setShowGradeModal(false)
    },
  })

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

  const { data: activityLogs } = useQuery({
    queryKey: ['my-activity', user?.id],
    queryFn: () => fetchActivityLogs(user!.id, 10),
    enabled: !!user,
  })

  const completedAttempts = attempts?.filter((a) => a.status === 'completed') ?? []
  const avgScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / completedAttempts.length)
    : 0

  const needsGrade = profile && !profile.grade && profile.role === 'student'

  useEffect(() => {
    if (needsGrade) setShowGradeModal(true)
  }, [needsGrade])

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


      {showGradeModal && !selectedGrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-2xl">
            <h2 className="mb-2 text-2xl font-black text-text">Welcome!</h2>
            <p className="mb-6 text-text-muted">Select your grade to get started.</p>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 10 }, (_, i) => i + 3).map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className="rounded-lg border border-border bg-white px-4 py-3 text-center font-bold text-text transition hover:border-brand hover:text-brand"
                >
                  Grade {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showGradeModal && selectedGrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-2xl text-center">
            <h2 className="mb-2 text-2xl font-black text-text">Confirm Your Grade</h2>
            <p className="mb-2 text-text-muted">You selected:</p>
            <p className="mb-6 text-5xl font-black text-brand">Grade {selectedGrade}</p>
            <p className="mb-6 text-sm text-text-muted">This can be changed later in Settings.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedGrade(null)}
                className="flex-1 rounded-lg border border-border px-4 py-3 text-text-muted transition hover:border-brand hover:text-text"
              >
                Change
              </button>
              <button
                onClick={() => updateGrade.mutate(selectedGrade)}
                className="flex-1 rounded-lg bg-brand px-4 py-3 font-bold text-white transition hover:bg-brand-light"
              >
                Yes, I'm in Grade {selectedGrade}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="mb-2 inline-block rounded-full border border-accent-green/20 bg-accent-green/10 px-4 py-1 text-sm text-accent-green">
          ✓ Signed in as {user.email}
        </div>
        <h1 className="text-3xl font-black text-text">Welcome back, {user.user_metadata.full_name}!</h1>
        <p className="mt-1 text-text-muted">Here's your learning overview</p>
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

      {completedAttempts.length >= 2 && (
        <div className="mt-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-bold text-text">Score Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={completedAttempts.slice().reverse().slice(-10).map(a => ({
              name: new Date(a.started_at).toLocaleDateString(),
              score: a.score ?? 0
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#1982C4" strokeWidth={2} dot={{ fill: '#1982C4' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-text">Recent Activity</h2>
        <div className="space-y-2">
          {activityLogs?.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
            >
              <div>
                <p className="font-medium text-text">
                  {log.action.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </p>
                {log.exam_id && (
                  <p className="text-xs text-text-muted">Exam #{log.exam_id.slice(0, 8)}</p>
                )}
              </div>
              <p className="text-xs text-text-muted">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          {activityLogs?.length === 0 && (
            <p className="text-sm text-text-muted">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}
