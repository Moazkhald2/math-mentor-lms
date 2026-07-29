import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function QuestionAnalysis() {
  const [subjectFilter, setSubjectFilter] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [minAttempts, setMinAttempts] = useState(5)
  const [sortBy, setSortBy] = useState<'accuracy' | 'attempts'>('accuracy')

  const { data: subjects } = useQuery({
    queryKey: ['qsubjects'],
    queryFn: async () => {
      const { data } = await supabase.from('questions').select('subject', { count: 'exact', head: false })
      return [...new Set((data ?? []).map((r: any) => r.subject).filter(Boolean))].sort() as string[]
    },
  })

  const { data: topics } = useQuery({
    queryKey: ['qtopics', subjectFilter],
    queryFn: async () => {
      let q = supabase.from('questions').select('topic', { count: 'exact', head: false })
      if (subjectFilter) q = q.eq('subject', subjectFilter)
      const { data } = await q
      return [...new Set((data ?? []).map((r: any) => r.topic).filter(Boolean))].sort() as string[]
    },
  })

  const { data: questionStats, isLoading } = useQuery({
    queryKey: ['question-analysis', subjectFilter, topicFilter],
    queryFn: async () => {
      let q = supabase.from('questions').select('id, question_text, subject, topic, difficulty, grade')
      if (subjectFilter) q = q.eq('subject', subjectFilter)
      if (topicFilter) q = q.eq('topic', topicFilter)
      const { data: questions } = await q
      if (!questions?.length) return []

      const qIds = questions.map((q: any) => q.id)
      const { data: answers } = await supabase
        .from('answers')
        .select('question_id, is_correct, points_earned, max_points')
        .in('question_id', qIds)

      const statsMap: Record<string, { correct: number; total: number; pointsEarned: number; maxPoints: number }> = {}
      for (const q of questions) {
        statsMap[q.id] = { correct: 0, total: 0, pointsEarned: 0, maxPoints: 0 }
      }
      for (const a of answers ?? []) {
        const s = statsMap[a.question_id]
        if (!s) continue
        s.total++
        if (a.is_correct) s.correct++
        s.pointsEarned += a.points_earned ?? 0
        s.maxPoints += a.max_points ?? 0
      }
      return questions.map((q: any) => ({
        ...q,
        attempts: statsMap[q.id]?.total ?? 0,
        correctCount: statsMap[q.id]?.correct ?? 0,
        accuracy: statsMap[q.id]?.total > 0 ? (statsMap[q.id].correct / statsMap[q.id].total * 100) : null,
        avgScore: statsMap[q.id]?.maxPoints > 0 ? (statsMap[q.id].pointsEarned / statsMap[q.id].maxPoints * 100) : null,
      }))
    },
  })

  const stats = (questionStats ?? [])
    .filter((q: any) => (q.attempts ?? 0) >= minAttempts)
    .sort((a: any, b: any) => sortBy === 'accuracy'
      ? (a.accuracy ?? 100) - (b.accuracy ?? 100)
      : (b.attempts ?? 0) - (a.attempts ?? 0))

  const difficultyLabel = (d: number | null) => d ? ['Easy', 'Medium', 'Hard', 'Expert'][d - 1] || '?' : '?'
  const difficultyColor = (d: number | null) => d === 1 ? 'text-accent-green' : d === 2 ? 'text-accent-gold' : d === 3 ? 'text-danger' : d === 4 ? 'text-brand' : 'text-text-muted'

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Question Analysis</h1>

      <div className="mb-6 flex flex-wrap gap-3">
        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-ink">
          <option value="">All subjects</option>
          {(subjects ?? []).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-ink">
          <option value="">All topics</option>
          {(topics ?? []).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-muted">Min attempts:</label>
          <input type="number" value={minAttempts} onChange={e => setMinAttempts(Number(e.target.value))} min={1} className="w-20 rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="rounded-lg border border-border bg-white px-4 py-2 text-ink text-sm">
          <option value="accuracy">Sort by accuracy (lowest)</option>
          <option value="attempts">Sort by attempts (most)</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Loading...</p>
      ) : stats.length === 0 ? (
        <p className="text-text-muted">No questions meet the filter criteria.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-text-muted"><tr>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3 text-center">Attempts</th>
              <th className="px-4 py-3 text-center">Accuracy</th>
              <th className="px-4 py-3 text-center">Avg Score</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {stats.map((q: any) => (
                <tr key={q.id} className="text-text hover:bg-surface/50">
                  <td className="max-w-xs truncate px-4 py-3 font-medium">{q.question_text}</td>
                  <td className="px-4 py-3 text-text-muted">{q.subject ?? '-'}</td>
                  <td className="px-4 py-3 text-text-muted">{q.topic ?? '-'}</td>
                  <td className={`px-4 py-3 ${difficultyColor(q.difficulty)}`}>{difficultyLabel(q.difficulty)}</td>
                  <td className="px-4 py-3 text-center font-bold">{q.attempts}</td>
                  <td className={`px-4 py-3 text-center font-bold ${q.accuracy !== null && q.accuracy < 40 ? 'text-danger' : q.accuracy !== null && q.accuracy < 60 ? 'text-accent-gold' : 'text-accent-green'}`}>
                    {q.accuracy !== null ? `${q.accuracy.toFixed(1)}%` : '-'}
                  </td>
                  <td className={`px-4 py-3 text-center font-bold ${q.avgScore !== null && q.avgScore < 40 ? 'text-danger' : q.avgScore !== null && q.avgScore < 60 ? 'text-accent-gold' : 'text-accent-green'}`}>
                    {q.avgScore !== null ? `${q.avgScore.toFixed(1)}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
