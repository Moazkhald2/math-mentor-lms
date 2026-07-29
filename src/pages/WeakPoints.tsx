import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { fetchSubjectSummary, fetchWeakPoints } from '../lib/weakpoints'
import type { WeakPoint } from '../lib/weakpoints'

export default function WeakPoints() {
  const { user } = useAuth()
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  const { data: subjects } = useQuery({
    queryKey: ['weakpoints-summary', user?.id],
    queryFn: () => fetchSubjectSummary(user!.id),
    enabled: !!user,
  })

  const { data: allPoints } = useQuery({
    queryKey: ['weakpoints-all', user?.id],
    queryFn: () => fetchWeakPoints(user!.id),
    enabled: !!user,
  })

  const filtered: WeakPoint[] = selectedSubject
    ? allPoints?.filter(p => p.subject === selectedSubject) ?? []
    : []

  if (!user) return <p className="text-text-muted">Sign in to view your weak points.</p>

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black text-text">Weak Points Analysis</h1>

      {!subjects?.length ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-text-muted">Complete some exams or practice sessions to see your weak points.</p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map(s => (
              <button
                key={s.subject}
                onClick={() => setSelectedSubject(selectedSubject === s.subject ? null : s.subject)}
                className={`rounded-xl border p-5 text-left transition ${
                  selectedSubject === s.subject ? 'border-brand bg-brand/5' : 'border-border bg-surface hover:border-brand/50'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold text-text">{s.subject}</h3>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    s.accuracy >= 70 ? 'bg-accent-green/20 text-accent-green' :
                    s.accuracy >= 50 ? 'bg-accent-gold/20 text-accent-gold' :
                    'bg-danger/20 text-danger'
                  }`}>
                    {s.accuracy}%
                  </span>
                </div>
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-border">
                  <div className={`h-full rounded-full ${
                    s.accuracy >= 70 ? 'bg-accent-green' :
                    s.accuracy >= 50 ? 'bg-accent-gold' : 'bg-danger'
                  }`} style={{ width: `${s.accuracy}%` }} />
                </div>
                <p className="text-xs text-text-muted">{s.correct}/{s.total} correct</p>
              </button>
            ))}
          </div>

          {selectedSubject && (
            <div>
              <h2 className="mb-4 text-xl font-bold text-text">{selectedSubject} — Topics</h2>
              <div className="space-y-3">
                {filtered.length === 0 ? (
                  <p className="text-sm text-text-muted">No topic data available for this subject.</p>
                ) : (
                  filtered.map(p => (
                    <div key={`${p.subject}-${p.topic}`} className="rounded-xl border border-border bg-surface p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text">{p.topic || '(untitled)'}</p>
                          <p className="text-xs text-text-muted">{p.correct}/{p.total} correct</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-border">
                            <div className={`h-full rounded-full ${
                              p.accuracy >= 70 ? 'bg-accent-green' :
                              p.accuracy >= 50 ? 'bg-accent-gold' : 'bg-danger'
                            }`} style={{ width: `${p.accuracy}%` }} />
                          </div>
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            p.accuracy >= 70 ? 'bg-accent-green/20 text-accent-green' :
                            p.accuracy >= 50 ? 'bg-accent-gold/20 text-accent-gold' :
                            'bg-danger/20 text-danger'
                          }`}>
                            {p.accuracy}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
