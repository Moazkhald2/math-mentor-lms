import { useState } from 'react'
import { supabase } from '../../lib/supabase'

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminCsvExport() {
  const [loaders, setLoaders] = useState({ attempts: false, students: false })
  const [period, setPeriod] = useState('all')
  const [gradeFilter, setGradeFilter] = useState<number | ''>('')
  const [classFilter, setClassFilter] = useState('')

  const handleExportAttempts = async () => {
    setLoaders(p => ({ ...p, attempts: true }))
    try {
      let query = supabase
        .from('exam_attempts')
        .select('*, profile:profiles(full_name, email, grade), exam:exams(title, type)')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (period === '7d') {
        const d = new Date(Date.now() - 7 * 86400000).toISOString()
        query = query.gte('completed_at', d)
      } else if (period === '30d') {
        const d = new Date(Date.now() - 30 * 86400000).toISOString()
        query = query.gte('completed_at', d)
      }

      const { data, error } = await query
      if (error) throw error
      if (!data?.length) { alert('No attempts found'); return }

      const rows = [['Student Name', 'Email', 'Grade', 'Exam', 'Type', 'Score', 'Completed At']]
      for (const a of data) {
        rows.push([
          a.profile?.full_name ?? '',
          a.profile?.email ?? '',
          String(a.profile?.grade ?? ''),
          a.exam?.title ?? '',
          a.exam?.type ?? '',
          String(a.score ?? 0),
          a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '',
        ])
      }
      downloadCSV(rows, `exam-results-${period}.csv`)
    } catch (e: any) { alert(e.message) }
    finally { setLoaders(p => ({ ...p, attempts: false })) }
  }

  const handleExportStudents = async () => {
    setLoaders(p => ({ ...p, students: true }))
    try {
      let query = supabase.from('profiles').select('*').eq('role', 'student').order('grade', { ascending: true }).order('full_name', { ascending: true })

      if (gradeFilter) query = query.eq('grade', gradeFilter)
      if (classFilter) query = query.eq('class_code', classFilter)

      const { data, error } = await query
      if (error) throw error
      if (!data?.length) { alert('No students found'); return }

      const rows = [['Name', 'Email', 'Grade', 'Class', 'Parent Phone', 'Telegram Chat ID', 'Joined']]
      for (const s of data) {
        rows.push([
          s.full_name || '',
          s.email || '',
          String(s.grade ?? ''),
          s.class_code || '',
          s.parent_phone || '',
          s.telegram_chat_id || '',
          new Date(s.created_at).toLocaleDateString(),
        ])
      }
      const suffix = `${gradeFilter ? `-grade${gradeFilter}` : ''}${classFilter ? `-${classFilter}` : ''}`
      downloadCSV(rows, `students${suffix}.csv`)
    } catch (e: any) { alert(e.message) }
    finally { setLoaders(p => ({ ...p, students: false })) }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">CSV Export</h1>

      <div className="mb-6 rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-bold text-text">Export Attempts</h2>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="mb-4 w-full rounded-lg border border-border bg-surface px-4 py-2 text-ink">
          <option value="all">All time</option>
          <option value="30d">Last 30 days</option>
          <option value="7d">Last 7 days</option>
        </select>
        <button onClick={handleExportAttempts} disabled={loaders.attempts}
          className="rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light disabled:opacity-50">
          {loaders.attempts ? 'Generating...' : 'Download CSV'}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-bold text-text">Export Students</h2>
        <p className="mb-4 text-sm text-text-muted">Download student profiles filtered by grade and/or class.</p>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-text-muted">Grade</label>
            <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-ink">
              <option value="">All grades</option>
              {Array.from({ length: 10 }, (_, i) => i + 3).map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-muted">Class Code</label>
            <input value={classFilter} onChange={e => setClassFilter(e.target.value)} placeholder="Filter by class code"
              className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-ink" />
          </div>
        </div>
        <button onClick={handleExportStudents} disabled={loaders.students}
          className="rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light disabled:opacity-50">
          {loaders.students ? 'Generating...' : 'Download CSV'}
        </button>
      </div>
    </div>
  )
}
