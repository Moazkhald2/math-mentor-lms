import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export default function AdminBulkExams() {
  const queryClient = useQueryClient()
  const [names, setNames] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'exam' | 'practice'>('exam')
  const [grade, setGrade] = useState<number | ''>('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<number | ''>('')
  const [questionCount, setQuestionCount] = useState(10)
  const [timeLimit, setTimeLimit] = useState(10)

  const { data: user } = useQuery({
    queryKey: ['my-id'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser()
      return data.user
    },
  })

  const bulkCreate = useMutation({
    mutationFn: async () => {
      const lines = names.split('\n').map(s => s.trim()).filter(Boolean)
      if (!lines.length) throw new Error('Enter at least one exam name')

      // Get available questions matching filters
      let q = supabase.from('questions').select('id')
      if (grade) q = q.eq('grade', Number(grade))
      if (subject) q = q.eq('subject', subject)
      if (topic) q = q.eq('topic', topic)
      if (difficulty) q = q.eq('difficulty', Number(difficulty))
      const { data: pool } = await q
      if (!pool?.length) throw new Error('No questions match the filters')
      if (pool.length < questionCount) throw new Error(`Only ${pool.length} questions available, need ${questionCount}`)

      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      const userId = user?.id

      for (const title of lines) {
        // 1. Create exam
        const { data: exam, error: examErr } = await supabase.from('exams').insert({
          title,
          description,
          type,
          grade: grade || null,
          time_limit_minutes: type === 'exam' ? timeLimit : 0,
          passing_score: 60,
          is_published: false,
          shuffle_questions: true,
          created_by: userId,
        }).select().single()
        if (examErr) throw examErr

        // 2. Auto-fill questions
        const picked = shuffled.splice(0, questionCount)
        const inserts = picked.map((qid: any, i: number) => ({
          exam_id: exam.id,
          question_id: qid.id,
          order_index: i,
        }))
        const { error: linkErr } = await supabase.from('exam_questions').insert(inserts)
        if (linkErr) throw linkErr
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] })
      setNames('')
      alert('Exams created successfully!')
    },
  })

  const existingExams = useQuery({
    queryKey: ['admin-exams-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, grade, type, is_published, exam_questions(count)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data?.map(e => ({ ...e, question_count: (e.exam_questions as any)?.[0]?.count ?? 0 })) ?? []
    },
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">Bulk Exam Creator</h1>
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 text-sm text-text-muted">
          Create multiple exams at once. Each exam will be auto-filled with random questions matching your filters.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-text-muted">Exam Names <span className="text-danger">*</span></label>
            <textarea value={names} onChange={e => setNames(e.target.value)} placeholder="Week 1 - Algebra&#10;Week 2 - Geometry&#10;Week 3 - Trigonometry" rows={5}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-text-muted">Description (shared)</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Weekly exam"
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Type</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink">
              <option value="exam">Exam</option>
              <option value="practice">Practice</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Time Limit (min)</label>
            <input type="number" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} min={1}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Grade</label>
            <select value={grade} onChange={e => setGrade(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink">
              <option value="">All grades</option>
              {Array.from({ length: 10 }, (_, i) => i + 3).map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Questions per Exam</label>
            <input type="number" value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} min={1} max={100}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Any"
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Topic</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Any"
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value ? Number(e.target.value) : '')} className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink">
              <option value="">Any</option>
              {[1, 2, 3, 4].map(d => <option key={d} value={d}>{['Easy', 'Medium', 'Hard', 'Expert'][d - 1]}</option>)}
            </select>
          </div>
        </div>

        {bulkCreate.isError && <p className="mt-4 text-sm text-danger">{(bulkCreate.error as any)?.message}</p>}
        <button onClick={() => bulkCreate.mutate()} disabled={!names.trim() || bulkCreate.isPending}
          className="mt-6 w-full rounded-lg bg-brand py-3 font-bold text-white hover:bg-brand-light disabled:opacity-50">
          {bulkCreate.isPending ? 'Creating...' : `Create ${names.split('\n').filter(Boolean).length || '?'} Exams`}
        </button>
      </div>

      {/* Existing exams list */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-text">Existing Exams</h2>
        {existingExams.isLoading && <p className="text-text-muted">Loading...</p>}
        {existingExams.data && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-text-muted">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Published</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {existingExams.data.map((e: any) => (
                  <tr key={e.id} className="text-text">
                    <td className="px-4 py-3">{e.title}</td>
                    <td className="px-4 py-3">{e.grade ?? '-'}</td>
                    <td className="px-4 py-3 capitalize">{e.type}</td>
                    <td className="px-4 py-3">{e.question_count}</td>
                    <td className="px-4 py-3">{e.is_published ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
                {existingExams.data.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-text-muted">No exams created yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
