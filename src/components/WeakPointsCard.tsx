import { useAuth } from '../hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { fetchSubjectSummary } from '../lib/weakpoints'
import { Link } from 'react-router-dom'

export default function WeakPointsCard() {
  const { user } = useAuth()

  const { data: subjects } = useQuery({
    queryKey: ['weakpoints-summary', user?.id],
    queryFn: () => fetchSubjectSummary(user!.id),
    enabled: !!user,
  })

  if (!subjects?.length) return null

  const weakSubjects = subjects.filter(s => s.accuracy < 70)

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-[rgba(0,0,0,0.04)_0px_4px_20px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">Weak Points</h2>
        <Link to="/weak-points" className="shrink-0 text-sm text-brand hover:underline">View Details →</Link>
      </div>
      <div className="space-y-3">
        {weakSubjects.length === 0 ? (
          <p className="text-sm text-success font-semibold">Great job! No weak subjects found.</p>
        ) : (
          weakSubjects.slice(0, 4).map(s => {
            const colorClass = s.accuracy < 50 ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'
            return (
              <div key={s.subject} className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">{s.subject}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full rounded-full ${s.accuracy < 50 ? 'bg-danger' : 'bg-warning'}`} style={{ width: `${s.accuracy}%` }} />
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${colorClass}`}>{s.accuracy}%</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
