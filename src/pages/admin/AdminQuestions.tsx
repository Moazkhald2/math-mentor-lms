import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import LatexRenderer from '../../components/LatexRenderer'

export default function AdminQuestions() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')
  const [diffFilter, setDiffFilter] = useState<number | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const { data: questions } = useQuery({
    queryKey: ['admin-questions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const filtered = (questions ?? []).filter(q =>
    (!typeFilter || q.type === typeFilter) &&
    (!diffFilter || q.difficulty === diffFilter)
  )

  const selectedQ = selected ? filtered.find(q => q.id === selected) : null

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Questions</h1>
      <div className="mb-4 flex gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-ink">
          <option value="">All types</option>
          <option value="multiple_choice">Multiple Choice</option>
          <option value="true_false">True/False</option>
          <option value="short_answer">Short Answer</option>
        </select>
        {[1, 2, 3, 4].map(d => (
          <button key={d} onClick={() => setDiffFilter(diffFilter === d ? null : d)}
            className={`rounded-lg border px-3 py-1 text-sm ${diffFilter === d ? 'bg-brand text-white border-brand' : 'border-border text-text-muted'}`}>
            {['Easy', 'Intermediate', 'Hard', 'Expert'][d - 1]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-text-muted"><tr>
              <th className="px-4 py-3">Type</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Topic</th><th className="px-4 py-3">Difficulty</th><th className="px-4 py-3">Preview</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map(q => (
                <tr key={q.id} onClick={() => setSelected(q.id)} className={`cursor-pointer text-text hover:bg-surface/50 ${selected === q.id ? 'bg-brand/10' : ''}`}>
                  <td className="px-4 py-3"><span className="rounded bg-brand/10 px-2 py-0.5 text-xs text-brand">{q.type.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3">{q.subject}</td>
                  <td className="px-4 py-3">{q.topic}</td>
                  <td className="px-4 py-3">{'●'.repeat(q.difficulty)}{'○'.repeat(4 - q.difficulty)}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-text-muted">{q.question_text.replace(/[$]/g, '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedQ && (
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-text">Question Detail</h2>
              <button onClick={() => { if (confirm('Delete this question?')) supabase.from('questions').delete().eq('id', selectedQ.id).then(() => { queryClient.invalidateQueries({ queryKey: ['admin-questions'] }); setSelected(null) }) }} className="text-sm text-danger hover:underline">Delete</button>
            </div>
            <p className="mb-4 text-lg font-medium text-text"><LatexRenderer content={selectedQ.question_text} /></p>
            {selectedQ.options?.length > 0 && (
              <div className="mb-4 space-y-2">
                {selectedQ.options.map((opt: string, i: number) => (
                  <div key={i} className={`rounded-lg border p-3 ${String(i) === selectedQ.correct_answer ? 'border-accent-green bg-accent-green/5' : 'border-border'}`}>
                    <LatexRenderer content={opt} />
                  </div>
                ))}
              </div>
            )}
            <p className="mb-2 text-sm"><span className="font-bold text-accent-green">Answer:</span> <LatexRenderer content={selectedQ.correct_answer} /></p>
            <p className="text-sm text-text-muted"><LatexRenderer content={selectedQ.explanation} /></p>
          </div>
        )}
      </div>
    </div>
  )
}
