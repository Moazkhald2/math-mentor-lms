import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function AdminExams() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')
  const [editingExam, setEditingExam] = useState<any>(null)

  const { data: exams } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const togglePublished = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from('exams').update({ is_published }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-exams'] }),
  })

  const deleteExam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exams').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-exams'] }),
  })

  const updateExam = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...fields } = data
      const { error } = await supabase.from('exams').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-exams'] }); setEditingExam(null) },
  })

  const filtered = (exams ?? []).filter(e => !typeFilter || e.type === typeFilter)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Exams</h1>
      <div className="mb-4 flex gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg border border-border bg-white px-4 py-2 text-ink">
          <option value="">All types</option>
          <option value="exam">Exam</option>
          <option value="practice">Practice</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-text-muted"><tr>
            <th className="px-4 py-3">Title</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Published</th><th className="px-4 py-3">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map(e => (
              <tr key={e.id} className="text-text hover:bg-surface/50">
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs ${e.type === 'exam' ? 'bg-accent-gold/10 text-accent-gold' : 'bg-accent-green/10 text-accent-green'}`}>{e.type}</span></td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {e.starts_at ? `${new Date(e.starts_at).toLocaleDateString()} → ${e.ends_at ? new Date(e.ends_at).toLocaleDateString() : '∞'}` : 'Always'}
                </td>
                <td className="px-4 py-3">{e.type === 'exam' ? `${e.time_limit_minutes} min` : '-'}</td>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={e.is_published} onChange={() => togglePublished.mutate({ id: e.id, is_published: !e.is_published })} className="h-4 w-4 accent-brand" />
                </td>
                <td className="px-4 py-3 space-x-3">
                  <button onClick={() => setEditingExam(e)} className="text-xs text-brand hover:underline">Edit</button>
                  <button onClick={() => { if (confirm('Delete this exam?')) deleteExam.mutate(e.id) }} className="text-xs text-danger hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingExam && (
        <ExamEditModal exam={editingExam} onSave={(data) => updateExam.mutate(data)} onClose={() => setEditingExam(null)} saving={updateExam.isPending} />
      )}
    </div>
  )
}

function ExamEditModal({ exam, onSave, onClose, saving }: {
  exam: any; onSave: (d: any) => void; onClose: () => void; saving: boolean
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(exam.title)
  const [description, setDescription] = useState(exam.description)
  const [timeLimit, setTimeLimit] = useState(exam.time_limit_minutes)
  const [passingScore, setPassingScore] = useState(exam.passing_score)
  const [grade, setGrade] = useState<number | ''>(exam.grade ?? '')
  const [startsAt, setStartsAt] = useState(exam.starts_at ? exam.starts_at.slice(0, 16) : '')
  const [endsAt, setEndsAt] = useState(exam.ends_at ? exam.ends_at.slice(0, 16) : '')
  const [questionFilter, setQuestionFilter] = useState('')
  const [selectedQIds, setSelectedQIds] = useState<Set<string>>(new Set())
  const [autoCount, setAutoCount] = useState(10)
  const [autoSubject, setAutoSubject] = useState('')
  const [autoTopic, setAutoTopic] = useState('')
  const [autoDifficulty, setAutoDifficulty] = useState<number | ''>('')

  const { data: linkedQuestions } = useQuery({
    queryKey: ['exam-linked', exam.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('exam_questions')
        .select('*, question:questions(question_text, subject, topic, difficulty)')
        .eq('exam_id', exam.id)
        .order('order_index', { ascending: true })
      return data ?? []
    },
  })

  const linkedIds = new Set((linkedQuestions ?? []).map((r: any) => r.question_id))

  const { data: allQuestions } = useQuery({
    queryKey: ['all-questions'],
    queryFn: async () => {
      const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const availableQuestions = (allQuestions ?? []).filter((q: any) => {
    if (linkedIds.has(q.id)) return false
    if (!questionFilter) return true
    const f = questionFilter.toLowerCase()
    return q.question_text?.toLowerCase().includes(f) || q.subject?.toLowerCase().includes(f) || q.topic?.toLowerCase().includes(f)
  })

  const handleSave = () => {
    const data: any = { id: exam.id, title, description, time_limit_minutes: Number(timeLimit), passing_score: Number(passingScore) }
    if (grade !== '') data.grade = Number(grade); else data.grade = null
    data.starts_at = startsAt ? new Date(startsAt).toISOString() : null
    data.ends_at = endsAt ? new Date(endsAt).toISOString() : null
    onSave(data)
  }

  const linkQuestions = useMutation({
    mutationFn: async () => {
      const existing = await supabase.from('exam_questions').select('order_index').eq('exam_id', exam.id).order('order_index', { ascending: false }).limit(1)
      const nextOrder = (existing.data?.[0]?.order_index ?? -1) + 1
      const inserts = [...selectedQIds].map((qid, i) => ({ exam_id: exam.id, question_id: qid, order_index: nextOrder + i }))
      const { error } = await supabase.from('exam_questions').insert(inserts)
      if (error) throw error
    },
    onSuccess: () => { setSelectedQIds(new Set()); queryClient.invalidateQueries({ queryKey: ['exam-linked', exam.id] }); queryClient.invalidateQueries({ queryKey: ['all-questions'] }) },
  })

  const autoFill = useMutation({
    mutationFn: async () => {
      let q = supabase.from('questions').select('id')
      if (exam.grade) q = q.eq('grade', exam.grade)
      if (autoSubject) q = q.eq('subject', autoSubject)
      if (autoTopic) q = q.eq('topic', autoTopic)
      if (autoDifficulty) q = q.eq('difficulty', autoDifficulty)
      const { data: pool } = await q
      if (!pool?.length) throw new Error('No matching questions found')
      const unlinked = pool.filter((qid: any) => !linkedIds.has(qid.id))
      if (!unlinked.length) throw new Error('All matching questions are already linked')
      const shuffled = [...unlinked].sort(() => Math.random() - 0.5).slice(0, Math.min(autoCount, unlinked.length))
      const existing = await supabase.from('exam_questions').select('order_index').eq('exam_id', exam.id).order('order_index', { ascending: false }).limit(1)
      const nextOrder = (existing.data?.[0]?.order_index ?? -1) + 1
      const inserts = shuffled.map((qid: any, i: number) => ({ exam_id: exam.id, question_id: qid.id, order_index: nextOrder + i }))
      const { error } = await supabase.from('exam_questions').insert(inserts)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exam-linked', exam.id] }); alert('Questions auto-filled!') },
  })

  const reorder = useMutation({
    mutationFn: async ({ question_id, newIndex }: { question_id: string; newIndex: number }) => {
      const { error } = await supabase.from('exam_questions').update({ order_index: newIndex }).eq('exam_id', exam.id).eq('question_id', question_id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam-linked', exam.id] }),
  })

  const removeQuestion = useMutation({
    mutationFn: async (question_id: string) => {
      const { error } = await supabase.from('exam_questions').delete().eq('exam_id', exam.id).eq('question_id', question_id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam-linked', exam.id] }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="mb-6 text-xl font-bold text-text">Edit Exam</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-text-muted">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-text-muted">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink" rows={2} />
          </div>
          <div><label className="mb-1 block text-sm text-text-muted">Time Limit (min)</label>
            <input type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink" /></div>
          <div><label className="mb-1 block text-sm text-text-muted">Passing Score %</label>
            <input type="number" value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink" /></div>
          <div><label className="mb-1 block text-sm text-text-muted">Grade</label>
            <select value={grade} onChange={e => setGrade(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink">
              <option value="">All grades</option>
              {Array.from({ length: 10 }, (_, i) => i + 3).map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select></div>
          <div className="sm:col-span-2"><label className="mb-1 block text-sm text-text-muted">Schedule</label>
            <div className="flex gap-2"><input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="flex-1 rounded-lg border border-border bg-white px-4 py-2 text-ink text-sm" />
              <span className="self-center text-text-muted">→</span>
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="flex-1 rounded-lg border border-border bg-white px-4 py-2 text-ink text-sm" /></div></div>
        </div>

        {/* Current questions */}
        <div className="mt-6 border-t border-border pt-6">
          <h3 className="mb-3 font-bold text-text">Questions ({linkedQuestions?.length ?? 0})</h3>
          {(!linkedQuestions || linkedQuestions.length === 0) && <p className="text-sm text-text-muted">No questions yet. Add them below.</p>}
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-bg p-2">
            {(linkedQuestions ?? []).map((eq: any, idx: number) => (
              <div key={eq.question_id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface/50">
                <span className="w-6 text-xs text-text-muted">{idx + 1}.</span>
                <span className="flex-1 truncate text-text">{eq.question?.question_text}</span>
                <span className="shrink-0 text-xs text-text-muted">{eq.question?.subject}</span>
                <button onClick={() => reorder.mutate({ question_id: eq.question_id, newIndex: idx - 1 })} disabled={idx === 0 || !linkedQuestions} className="text-text-muted hover:text-text disabled:opacity-20">↑</button>
                <button onClick={() => reorder.mutate({ question_id: eq.question_id, newIndex: idx + 1 })} disabled={!linkedQuestions || idx === linkedQuestions.length - 1} className="text-text-muted hover:text-text disabled:opacity-20">↓</button>
                <button onClick={() => { if (confirm('Remove this question?')) removeQuestion.mutate(eq.question_id) }} className="text-danger hover:underline">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-fill */}
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="mb-3 font-bold text-text">Auto-fill Questions</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <div><label className="mb-1 block text-xs text-text-muted">Count</label>
              <input type="number" value={autoCount} onChange={e => setAutoCount(Number(e.target.value))} min={1} max={100} className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-ink" /></div>
            <div><label className="mb-1 block text-xs text-text-muted">Subject</label>
              <input value={autoSubject} onChange={e => setAutoSubject(e.target.value)} placeholder="Any" className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-ink" /></div>
            <div><label className="mb-1 block text-xs text-text-muted">Topic</label>
              <input value={autoTopic} onChange={e => setAutoTopic(e.target.value)} placeholder="Any" className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-ink" /></div>
            <div><label className="mb-1 block text-xs text-text-muted">Difficulty</label>
              <select value={autoDifficulty} onChange={e => setAutoDifficulty(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-ink">
                <option value="">Any</option>
                {[1, 2, 3, 4].map(d => <option key={d} value={d}>{['Easy', 'Medium', 'Hard', 'Expert'][d - 1]}</option>)}
              </select></div>
          </div>
          <button onClick={() => autoFill.mutate()} disabled={autoFill.isPending} className="mt-3 rounded-lg bg-accent-green px-4 py-2 text-sm font-semibold text-white hover:bg-accent-green/80 disabled:opacity-50">
            {autoFill.isPending ? 'Filling...' : `Auto-fill ${autoCount} Questions`}
          </button>
          {autoFill.isError && <p className="mt-1 text-xs text-danger">{(autoFill.error as any)?.message}</p>}
        </div>

        {/* Manual add */}
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="mb-3 font-bold text-text">Add Questions Manually</h3>
          <input value={questionFilter} onChange={e => setQuestionFilter(e.target.value)} placeholder="Search..." className="mb-3 w-full rounded-lg border border-border bg-white px-4 py-2 text-ink text-sm" />
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-bg p-2">
            {availableQuestions.length === 0 && <p className="p-2 text-sm text-text-muted">No more questions available.</p>}
            {availableQuestions.slice(0, 40).map((q: any) => (
              <label key={q.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface/50">
                <input type="checkbox" checked={selectedQIds.has(q.id)} onChange={() => {
                  const next = new Set(selectedQIds)
                  if (next.has(q.id)) next.delete(q.id); else next.add(q.id)
                  setSelectedQIds(next)
                }} className="h-4 w-4 accent-brand" />
                <span className="flex-1 truncate text-text">{q.question_text}</span>
                {q.subject && <span className="shrink-0 text-xs text-text-muted">{q.subject}</span>}
              </label>
            ))}
          </div>
          <button onClick={() => linkQuestions.mutate()} disabled={selectedQIds.size === 0 || linkQuestions.isPending}
            className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-50">
            Link {selectedQIds.size > 0 ? `(${selectedQIds.size})` : ''} Questions
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <button onClick={onClose} className="rounded-lg border border-border px-6 py-2 text-text-muted hover:text-text">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
