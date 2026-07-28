import { useQuery } from '@tanstack/react-query'
import { fetchQuestions } from '../lib/questions'
import QuestionCard from '../components/QuestionCard'
import type { Difficulty } from '../types'
import { DIFFICULTY_LABELS } from '../types'
import { useState } from 'react'

const DIFFICULTIES = [1, 2, 3, 4] as Difficulty[]

export default function Questions() {
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | null>(null)

  const { data: questions, isLoading, error } = useQuery({
    queryKey: ['questions', filterDifficulty],
    queryFn: fetchQuestions,
  })

  const filtered = filterDifficulty
    ? questions?.filter((q) => q.difficulty === filterDifficulty)
    : questions

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-text">Questions</h1>
          <p className="mt-1 text-text-muted">Browse the question bank</p>
        </div>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDifficulty(filterDifficulty === d ? null : d)}
              className={`rounded-lg border px-3 py-1 text-sm font-medium transition-colors ${
                filterDifficulty === d
                  ? 'border-brand bg-brand text-white'
                  : 'border-border text-text-muted hover:text-text'
              }`}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-text-muted">Loading questions...</p>}

      {error && (
        <p className="text-danger">
          Could not load questions. Make sure the Supabase project is connected.
        </p>
      )}

      {filtered && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-lg text-text-muted">No questions yet</p>
          <p className="mt-1 text-sm text-text-muted">
            Questions will appear here once added to the database.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {filtered?.map((q) => <QuestionCard key={q.id} question={q} />)}
      </div>
    </div>
  )
}
