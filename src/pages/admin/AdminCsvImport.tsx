import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { Question } from '../../types'

export default function AdminCsvImport() {
  const [results, setResults] = useState<{ imported: number; errors: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const parseCSV = (text: string): Partial<Question>[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, j) => { row[h] = vals[j] ?? '' })
      const options = [row.a || row.option_a || '', row.b || row.option_b || '', row.c || row.option_c || '', row.d || row.option_d || ''].filter(Boolean)
      return {
        question_text: row.question_text || row.question || '',
        options,
        correct_answer: row.correct_answer || row.correct || '',
        type: (row.type || 'multiple_choice') as Question['type'],
        subject: row.subject || '',
        topic: row.topic || '',
        difficulty: (Number(row.difficulty) || 2) as Question['difficulty'],
        explanation: row.explanation || '',
        image_url: row.image_url || '',
      }
    })
  }

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setLoading(true)
    setResults(null)
    try {
      const text = await file.text()
      const questions = parseCSV(text)
      if (questions.length === 0) { setResults({ imported: 0, errors: ['No valid rows'] }); return }
      const errors: string[] = []
      let imported = 0
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q.question_text || !q.options?.length || !q.correct_answer) {
          errors.push(`Row ${i + 2}: missing required fields (question_text, options a/b/c/d, correct_answer)`)
          continue
        }
        const { error } = await supabase.from('questions').insert(q)
        if (error) errors.push(`Row ${i + 2}: ${error.message}`)
        else imported++
      }
      setResults({ imported, errors })
    } catch (e: any) {
      setResults({ imported: 0, errors: [e.message] })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black text-text">CSV Import</h1>
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-bold text-text">Import Questions</h2>
        <p className="mb-4 text-sm text-text-muted">
          CSV columns: <code className="rounded bg-bg px-1 text-text">question_text, a, b, c, d, correct_answer, type, subject, topic, difficulty, explanation, image_url</code>
        </p>
        <input ref={fileRef} type="file" accept=".csv" className="mb-4 block w-full text-sm text-text-muted file:mr-3 file:rounded file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:text-white" />
        <button onClick={handleImport} disabled={loading} className="rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light disabled:opacity-50">
          {loading ? 'Importing...' : 'Import CSV'}
        </button>
        {results && (
          <div className="mt-4 space-y-2">
            <p className="text-accent-green">✅ {results.imported} questions imported</p>
            {results.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg bg-danger/10 p-3">
                {results.errors.map((e, i) => <p key={i} className="text-sm text-danger">{e}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
