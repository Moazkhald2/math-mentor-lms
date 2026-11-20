import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchExams } from '../lib/exams'
import { fetchUserPracticeProgress } from '../lib/practice'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

import { ALL_GRADES } from '../lib/grades'

const AVAILABLE_GRADES = ALL_GRADES

// Sheets = practice-type exams: self-paced, instant feedback, retry with new numbers.
export default function Sheets() {
  const { user } = useAuth()
  const [selectedGrade, setSelectedGrade] = useState<number>(() => {
    const saved = localStorage.getItem('math_mentor_current_grade')
    return saved ? Number(saved) : 10
  })

  // Load user's enrolled profile grade and role
  const { data: profile } = useQuery({
    queryKey: ['my-grade', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase.from('profiles').select('grade, role').eq('id', user.id).single()
      return data as { grade: number | null; role?: string | null } | null
    },
    enabled: !!user,
  })

  const isStaff = profile?.role === 'teacher' || profile?.role === 'admin'
  const effectiveGrade = !isStaff && profile?.grade ? profile.grade : selectedGrade

  useEffect(() => {
    if (profile?.grade) {
      setSelectedGrade(profile.grade)
      localStorage.setItem('math_mentor_current_grade', String(profile.grade))
    }
  }, [profile?.grade])

  const handleSelectGrade = (g: number) => {
    if (!isStaff) return
    setSelectedGrade(g)
    localStorage.setItem('math_mentor_current_grade', String(g))
  }

  const examsQ = useQuery({ queryKey: ['sheets'], queryFn: () => fetchExams(), enabled: !!user })

  // Strict grade isolation: students ONLY see published sheets belonging to their exact enrolled grade
  const allSheets = (examsQ.data ?? []).filter((e) => e.type === 'practice' && e.is_published)
  const filteredSheets = allSheets.filter((s) =>
    isStaff ? (!s.grade || s.grade === effectiveGrade) : s.grade === effectiveGrade
  )
  const filteredSheetIds = useMemo(() => filteredSheets.map((s) => s.id), [filteredSheets])

  const progressQ = useQuery({
    queryKey: ['practice-progress', user?.id, filteredSheetIds.join(',')],
    queryFn: () => fetchUserPracticeProgress(user!.id, filteredSheetIds),
    enabled: !!user && filteredSheetIds.length > 0,
  })

  const progressByExam = progressQ.data ?? {}

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-border/60 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
              Practice Sheets
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Self-paced sheets — progress saves automatically so you can pause and resume anytime.
            </p>
          </div>

          <div className="rounded-xl border border-brand/20 bg-brand/5 px-3.5 py-1.5 text-xs font-bold text-brand self-start sm:self-auto">
            Grade {effectiveGrade} Content
          </div>
        </div>

        {/* Grade Selector Tabs: Teachers & Admins only (students are strictly locked to their grade) */}
        {isStaff && (
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
                  effectiveGrade === g
                    ? 'bg-brand text-white shadow-xs'
                    : 'border border-border bg-surface text-text hover:border-brand'
                }`}
              >
                Grade {g}
              </button>
            ))}
          </div>
        )}
      </header>

      {examsQ.isLoading && <p className="text-text-muted">Loading sheets...</p>}

      {filteredSheets.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center space-y-2">
          <div className="text-3xl">📄</div>
          <h2 className="text-lg font-bold text-ink">No Practice Sheets for Grade {effectiveGrade}</h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            {isStaff
              ? `There are currently no practice sheets published for Grade ${effectiveGrade}. Select another grade above to preview other grades.`
              : `No practice sheets have been published for Grade ${effectiveGrade} yet. Check back soon!`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredSheets.map((s) => {
            const progress = progressByExam[s.id]
            const isInProgress = !!progress
            const hasTotal = isInProgress && progress.totalQuestions && progress.totalQuestions > 0
            const pct = hasTotal
              ? Math.min(100, Math.round((progress.answeredCount / progress.totalQuestions!) * 100))
              : null

            return (
              <Link
                key={s.id}
                to={`/practice/${s.id}`}
                className={`hover-lift block rounded-2xl border p-6 transition hover:no-underline shadow-xs ${
                  isInProgress
                    ? 'border-brand/50 bg-brand/[0.02] hover:border-brand'
                    : 'border-border bg-surface hover:border-brand/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md px-2.5 py-0.5 text-xs font-bold text-white bg-accent-green shadow-2xs">
                      Sheet
                    </span>
                    {isInProgress && (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                        In Progress
                      </span>
                    )}
                  </div>
                  <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
                    Grade {s.grade ?? selectedGrade}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-text">{s.title}</h2>
                <p className="mt-1 text-sm text-text-muted line-clamp-2">
                  {s.description || 'Self-paced practice sheet with immediate feedback.'}
                </p>

                {isInProgress && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink">
                      <span>
                        {hasTotal
                          ? `${progress.answeredCount} / ${progress.totalQuestions} answered`
                          : `${progress.answeredCount} answered • Saved`}
                      </span>
                      {pct !== null && <span className="text-brand">{pct}%</span>}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${pct ?? (progress.answeredCount > 0 ? 35 : 10)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-xs text-text-muted pt-3 border-t border-border/50">
                  <span>{s.time_limit_minutes ? `⏱ ${s.time_limit_minutes} min` : 'Untimed self-paced'}</span>
                  {isInProgress ? (
                    <span className="rounded-lg bg-brand px-3 py-1 font-bold text-white shadow-2xs">
                      Resume Sheet →
                    </span>
                  ) : (
                    <span className="font-bold text-brand hover:underline">Start Practice →</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
