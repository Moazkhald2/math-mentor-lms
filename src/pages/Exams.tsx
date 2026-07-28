import { useQuery } from '@tanstack/react-query'
import { fetchExams } from '../lib/exams'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Exams() {
  const { user } = useAuth()
  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: fetchExams,
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
    return exam.is_published
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text">Exams & Practice</h1>
        <p className="mt-1 text-text-muted">Timed exams and untimed practice sheets</p>
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
        {filtered.map((exam) => (
          <div
            key={exam.id}
            className="rounded-xl border border-border bg-surface p-6 transition hover:border-brand/50"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs ${exam.type === 'exam' ? 'bg-accent-gold/10 text-accent-gold' : 'bg-accent-green/10 text-accent-green'}`}>
                {exam.type === 'exam' ? 'Exam' : 'Practice'}
              </span>
            </div>

            <div className="mb-4">
              <h2 className="text-xl font-bold text-text">{exam.title}</h2>
              <p className="mt-1 text-sm text-text-muted">{exam.description}</p>
            </div>

            <div className="mb-6 flex gap-4 text-sm text-text-muted">
              {exam.type === 'exam' ? (
                <>
                  <span>⏱ {exam.time_limit_minutes} min</span>
                  <span>✓ {exam.passing_score}% to pass</span>
                </>
              ) : (
                <span>No timer · instant feedback</span>
              )}
            </div>

            {user ? (
              <a
                href={exam.type === 'practice' ? `/practice/${exam.id}` : `/exam/${exam.id}`}
                className="inline-block rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light"
              >
                {exam.type === 'practice' ? 'Start Practice' : 'Start Exam'}
              </a>
            ) : (
              <a
                href="/login"
                className="inline-block rounded-lg border border-border px-6 py-2 text-sm text-text-muted hover:text-text"
              >
                Sign in to start
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
