import { useQuery } from '@tanstack/react-query'
import { fetchExams } from '../lib/exams'
import { useAuth } from '../hooks/useAuth'

export default function Exams() {
  const { user } = useAuth()
  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: fetchExams,
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text">Exams</h1>
        <p className="mt-1 text-text-muted">Practice timed exams</p>
      </div>

      {isLoading && <p className="text-text-muted">Loading exams...</p>}

      {exams && exams.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-lg text-text-muted">No exams available</p>
          <p className="mt-1 text-sm text-text-muted">
            Exams will appear here once created.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {exams?.map((exam) => (
          <div
            key={exam.id}
            className="rounded-xl border border-border bg-surface p-6 transition hover:border-brand/50"
          >
            <div className="mb-4">
              <h2 className="text-xl font-bold text-text">{exam.title}</h2>
              <p className="mt-1 text-sm text-text-muted">{exam.description}</p>
            </div>

            <div className="mb-6 flex gap-4 text-sm text-text-muted">
              <span>⏱ {exam.time_limit_minutes} min</span>
              <span>✓ {exam.passing_score}% to pass</span>
            </div>

            {user ? (
              <a
                href={`/exam/${exam.id}`}
                className="inline-block rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light"
              >
                Start Exam
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
