import { useQuery } from '@tanstack/react-query'
import { fetchExams, getBestScore, cooldownRemainingMs } from '../lib/exams'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { ExamAttempt } from '../types'

export default function Exams() {
  const { user } = useAuth()
  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: fetchExams,
  })

  const { data: myAttempts = [] } = useQuery({
    queryKey: ['my-exam-attempts', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', user.id)
      if (error) throw error
      return data as ExamAttempt[]
    },
    enabled: !!user,
  })

  const { data: profile } = useQuery({
    queryKey: ['my-grade'],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase.from('profiles').select('grade').eq('id', user.id).single()
      return data as { grade: number } | null
    },
    enabled: !!user,
  })

  const filtered = (exams ?? []).filter(exam => {
    if (exam.type !== 'exam' && exam.type !== 'practice') return false
    if (profile?.grade && exam.grade && exam.grade !== profile.grade) return false
    if (!exam.is_published) return false
    const now = new Date()
    if (exam.starts_at && now < new Date(exam.starts_at)) return false
    if (exam.ends_at && now > new Date(exam.ends_at)) return false
    return true
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text">Exams & Practice</h1>
        <p className="mt-1 text-text-muted">Timed exams and untimed practice sheets</p>
        {user && profile?.grade && (
          <p className="mt-2 text-sm text-text-muted">Showing exams for Grade {profile.grade}</p>
        )}
      </div>

      {isLoading && <p className="text-text-muted">Loading...</p>}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-lg text-text-muted">No exams available</p>
          <p className="mt-1 text-sm text-text-muted">
            Exams will appear here once created.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((exam) => {
          const examAttempts = myAttempts.filter(a => a.exam_id === exam.id)
          const used = examAttempts.filter(a => a.status === 'completed').length
          const best = getBestScore(examAttempts)
          const cooldownMs = cooldownRemainingMs(exam, examAttempts)
          const locked = exam.type === 'exam' && (used >= (exam.max_attempts ?? 3) || cooldownMs > 0)
          return (
          <a
            key={exam.id}
            href={user ? (exam.type === 'practice' ? `/practice/${exam.id}` : `/exam/${exam.id}`) : '/login'}
            className="hover-lift block rounded-xl border border-border bg-surface p-6 transition hover:border-brand/50 hover:no-underline"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs ${exam.type === 'exam' ? 'bg-accent-gold/10 text-accent-gold' : 'bg-accent-green/10 text-accent-green'}`}>
                {exam.type === 'exam' ? 'Exam' : 'Practice'}
              </span>
              {exam.is_important && (
                <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                  ⭐ Important
                </span>
              )}
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-bold text-text">{exam.title}</h2>
              <p className="mt-1 text-sm text-text-muted">{exam.description}</p>
            </div>

            {exam.type === 'exam' && (
              <div className="mb-1 mt-1 text-xs">
                <span>Attempts: {Math.min(used, exam.max_attempts ?? 3)}/{exam.max_attempts ?? 3}</span>
                {best > 0 && <span className="ml-3 font-semibold text-accent-green">Best: {best}%</span>}
              </div>
            )}

            <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
              {exam.type === 'exam' ? (
                <>
                  <span>⏱ {exam.time_limit_minutes} min</span>
                  <span>✓ {exam.passing_score}% to pass</span>
                </>
              ) : (
                <span>No timer · instant feedback</span>
              )}
              {exam.starts_at && <span>📅 {new Date(exam.starts_at).toLocaleDateString()} — {exam.ends_at ? new Date(exam.ends_at).toLocaleDateString() : '∞'}</span>}
            </div>

            {exam.type === 'practice' ? (
              <span className="inline-block rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light">Start Practice</span>
            ) : locked ? (
              <span className="inline-block rounded-lg px-6 py-2 font-semibold text-text-muted">
                {cooldownMs > 0 ? `Next attempt in ${Math.ceil(cooldownMs / 3.6e6)}h` : 'No attempts left'}
              </span>
            ) : (
              <span className="inline-block rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light">Start Exam</span>
            )}
          </a>
          )
        })}
      </div>
    </div>
  )
}
