import { useQuery } from '@tanstack/react-query'
import { fetchExams } from '../lib/exams'
import { useAuth } from '../hooks/useAuth'

// Sheets = practice-type exams: self-paced, instant feedback, retry with new numbers.
export default function Sheets() {
  const { user } = useAuth()
  const examsQ = useQuery({ queryKey: ['sheets'], queryFn: () => fetchExams() })
  const sheets = (examsQ.data ?? []).filter((e) => e.type === 'practice' && e.is_published)

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Practice Sheets</h1>
        <p className="mt-1 text-sm text-text-muted">
          Self-paced sheets — see solutions as you go, and retry with new numbers after a miss.
        </p>
      </header>

      {sheets.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-text-muted">No practice sheets published yet — check back soon.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sheets.map((s) => (
            <a
              key={s.id}
              href={user ? `/practice/${s.id}` : '/login'}
              className="hover-lift block rounded-xl border border-border bg-surface p-6 transition hover:border-brand/50 hover:no-underline"
            >
              <span className="rounded px-2 py-0.5 text-xs text-white bg-accent-green">Sheet</span>
              <h2 className="mt-2 text-lg font-bold text-text">{s.title}</h2>
              <p className="mt-1 text-sm text-text-muted">
                {s.grade ? `Grade ${s.grade}` : 'All grades'}
                {s.time_limit_minutes ? ` · ${s.time_limit_minutes} min` : ' · untimed'}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
