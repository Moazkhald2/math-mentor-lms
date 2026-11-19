import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchExams } from '../lib/exams'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const AVAILABLE_GRADES = [6, 7, 8, 9, 10, 11, 12]

// Sheets = practice-type exams: self-paced, instant feedback, retry with new numbers.
export default function Sheets() {
  const { user } = useAuth()
  const [selectedGrade, setSelectedGrade] = useState<number>(() => {
    const saved = localStorage.getItem('math_mentor_current_grade')
    return saved ? Number(saved) : 10
  })

  // Load user's enrolled profile grade if available
  const { data: profile } = useQuery({
    queryKey: ['my-grade', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase.from('profiles').select('grade').eq('id', user.id).single()
      return data as { grade: number | null } | null
    },
    enabled: !!user,
  })

  useEffect(() => {
    if (profile?.grade) {
      setSelectedGrade(profile.grade)
      localStorage.setItem('math_mentor_current_grade', String(profile.grade))
    }
  }, [profile?.grade])

  const handleSelectGrade = (g: number) => {
    setSelectedGrade(g)
    localStorage.setItem('math_mentor_current_grade', String(g))
  }

  const examsQ = useQuery({ queryKey: ['sheets'], queryFn: () => fetchExams() })

  // Strict grade isolation: only sheets for the selected grade appear
  const allSheets = (examsQ.data ?? []).filter((e) => e.type === 'practice' && e.is_published)
  const filteredSheets = allSheets.filter((s) => !s.grade || s.grade === selectedGrade)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-border/60 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
              Practice Sheets
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Self-paced sheets — see solutions as you go, and retry with new numbers after a miss.
            </p>
          </div>

          <div className="rounded-xl border border-brand/20 bg-brand/5 px-3.5 py-1.5 text-xs font-bold text-brand self-start sm:self-auto">
            Showing Grade {selectedGrade} Content
          </div>
        </div>

        {/* Grade Selector Tabs: content of each grade only appears for that grade */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted mr-1.5">
            Select Grade:
          </span>
          {AVAILABLE_GRADES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => handleSelectGrade(g)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                selectedGrade === g
                  ? 'bg-brand text-white shadow-xs'
                  : 'border border-border bg-surface text-text hover:border-brand'
              }`}
            >
              Grade {g}
            </button>
          ))}
        </div>
      </header>

      {examsQ.isLoading && <p className="text-text-muted">Loading sheets...</p>}

      {filteredSheets.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center space-y-2">
          <div className="text-3xl">📄</div>
          <h2 className="text-lg font-bold text-ink">No Practice Sheets for Grade {selectedGrade}</h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            There are currently no practice sheets published for Grade {selectedGrade}. Select another grade above or check back soon!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredSheets.map((s) => (
            <Link
              key={s.id}
              to={`/practice/${s.id}`}
              className="hover-lift block rounded-2xl border border-border bg-surface p-6 transition hover:border-brand/50 hover:no-underline shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-md px-2.5 py-0.5 text-xs font-bold text-white bg-accent-green shadow-2xs">
                  Sheet
                </span>
                <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
                  Grade {s.grade ?? selectedGrade}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-bold text-text">{s.title}</h2>
              <p className="mt-1 text-sm text-text-muted line-clamp-2">
                {s.description || 'Self-paced practice sheet with immediate feedback.'}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-text-muted pt-3 border-t border-border/50">
                <span>{s.time_limit_minutes ? `⏱ ${s.time_limit_minutes} min` : 'Untimed self-paced'}</span>
                <span className="font-bold text-brand hover:underline">Start Practice →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
