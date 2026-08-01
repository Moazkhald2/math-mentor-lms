import { useQuery } from '@tanstack/react-query'
import { fetchQuestions, fetchQuestionFilters, fetchTopicsForSubject } from '../lib/questions'
import QuestionCard from '../components/QuestionCard'
import { useState } from 'react'

export default function Questions() {
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<number | ''>('')

  const { data: filters } = useQuery({
    queryKey: ['question-filters'],
    queryFn: fetchQuestionFilters,
  })

  const { data: topicsForSubject } = useQuery({
    queryKey: ['topics-for-subject', subject],
    queryFn: () => fetchTopicsForSubject(subject),
    enabled: !!subject,
  })

  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions', { subject, topic, difficulty }],
    queryFn: () => fetchQuestions({
      subject: subject || undefined,
      topic: topic || undefined,
      difficulty: (difficulty || undefined) as any,
    }),
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black text-text">Questions</h1>
        <p className="mt-1 text-text-muted">Browse the question bank</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <select value={subject} onChange={e => { setSubject(e.target.value); setTopic('') }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
          <option value="">All subjects</option>
          {filters?.subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {subject && (
          <select value={topic} onChange={e => setTopic(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
            <option value="">All topics</option>
            {topicsForSubject.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <select value={difficulty} onChange={e => setDifficulty(e.target.value ? Number(e.target.value) : '')}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
          <option value="">All difficulties</option>
          {[1, 2, 3, 4].map(d => (
            <option key={d} value={d}>{['Easy', 'Medium', 'Hard', 'Expert'][d - 1]}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-text-muted">Loading questions...</p>}

      {questions && questions.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-lg text-text-muted">No questions match your filters</p>
        </div>
      )}

      <div className="space-y-4">
        {questions?.map(q => <QuestionCard key={q.id} question={q} />)}
      </div>
    </div>
  )
}
