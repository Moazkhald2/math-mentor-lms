import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchExams, getBestScore, cooldownRemainingMs } from '../lib/exams'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { ExamAttempt } from '../types'

import { ALL_GRADES } from '../lib/grades'

const AVAILABLE_GRADES = ALL_GRADES

export default function Exams() {
  const { user } = useAuth()
  const [selectedGrade, setSelectedGrade] = useState<number>(() => {
    const saved = localStorage.getItem('math_mentor_current_grade')
    return saved ? Number(saved) : 10
  })

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
    queryKey: ['my-grade', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase.from('profiles').select('grade').eq('id', user.id).single()
      return data as { grade: number | null } | null
    },
    enabled: !!user,
  })

  // Sync profile grade on load
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

  // Auto apply fullscreen on exam enter
  const handleExamClick = (examType: string) => {
    if (examType === 'exam') {
      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {})
        }
      } catch {}
    }
  }

  // Strict grade isolation: only exams matching this grade appear
  const filtered = (exams ?? []).filter((exam) => {
    if (exam.type !== 'exam' && exam.type !== 'practice') return false
    if (!exam.is_published) return false
    if (exam.grade && exam.grade !== selectedGrade) return false
    const now = new Date()
    if (exam.starts_at && now < new Date(exam.starts_at)) return false
    if (exam.ends_at && now > new Date(exam.ends_at)) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="border-b border-border/60 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-text">Exams & Practice</h1>
            <p className="mt-1 text-text-muted">Timed exams and untimed practice sheets</p>
          </div>

          <div className="rounded-xl border border-brand/20 bg-brand/5 px-3.5 py-1.5 text-xs font-bold text-brand self-start sm:self-auto">
            Showing Grade {selectedGrade} Content
          </div>
        </div>

        {/* Grade Selector Tabs: Grade-isolated content */}
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
      </div>

      {isLoading && <p className="text-text-muted">Loading...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-2">
          <p className="text-lg text-text-muted">No exams available</p>
          <p className="text-sm text-text-muted">
            Exams created for Grade {selectedGrade} will appear here. Select another grade above to view other exams.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((exam) => {
          const examAttempts = myAttempts.filter((a) => a.exam_id === exam.id)
          const used = examAttempts.filter((a) => a.status === 'completed').length
          const best = getBestScore(examAttempts)
          const cooldownMs = cooldownRemainingMs(exam, examAttempts)
          const locked = exam.type === 'exam' && (used >= (exam.max_attempts ?? 3) || cooldownMs > 0)
          const targetUrl = user
            ? exam.type === 'practice'
              ? `/practice/${exam.id}`
              : `/exam/${exam.id}`
            : '/login'

          return (
            <a
              key={exam.id}
              href={targetUrl}
              onClick={() => handleExamClick(exam.type)}
              className="hover-lift block rounded-2xl border border-border bg-surface p-6 transition hover:border-brand/50 hover:no-underline shadow-xs"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                      exam.type === 'exam'
                        ? 'bg-accent-gold/15 text-accent-gold'
                        : 'bg-accent-green/15 text-accent-green'
                    }`}
                  >
                    {exam.type === 'exam' ? 'Exam' : 'Practice'}
                  </span>
                  {exam.is_important && (
                    <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                      ⭐ Important
                    </span>
                  )}
                </div>

                <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
                  Grade {exam.grade ?? selectedGrade}
                </span>
              </div>

              <div className="mb-4">
                <h2 className="text-xl font-bold text-text">{exam.title}</h2>
                <p className="mt-1 text-sm text-text-muted line-clamp-2">{exam.description}</p>
              </div>

              {exam.type === 'exam' && (
                <div className="mb-2 text-xs">
                  <span>
                    Attempts: {Math.min(used, exam.max_attempts ?? 3)}/{exam.max_attempts ?? 3}
                  </span>
                  {best > 0 && (
                    <span className="ml-3 font-semibold text-accent-green">Best: {best}%</span>
                  )}
                </div>
              )}

              <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
                {exam.type === 'exam' ? (
                  <>
                    <span>⏱ {exam.time_limit_minutes} min</span>
                    <span>✓ {exam.passing_score}% to pass</span>
                    <span className="text-xs text-brand font-semibold">🛡️ Fullscreen Mode</span>
                  </>
                ) : (
                  <span>No timer · instant feedback</span>
                )}
                {exam.starts_at && (
                  <span>
                    📅 {new Date(exam.starts_at).toLocaleDateString()} —{' '}
                    {exam.ends_at ? new Date(exam.ends_at).toLocaleDateString() : '∞'}
                  </span>
                )}
              </div>

              {exam.type === 'practice' ? (
                <span className="inline-block rounded-xl bg-brand px-6 py-2.5 font-bold text-white hover:bg-brand-light transition">
                  Start Practice
                </span>
              ) : locked ? (
                <span className="inline-block rounded-xl border border-border bg-bg px-6 py-2.5 font-semibold text-text-muted">
                  {cooldownMs > 0
                    ? `Next attempt in ${Math.ceil(cooldownMs / 3.6e6)}h`
                    : 'No attempts left'}
                </span>
              ) : (
                <span className="inline-block rounded-xl bg-brand px-6 py-2.5 font-bold text-white hover:bg-brand-light transition shadow-sm">
                  Start Exam
                </span>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}
