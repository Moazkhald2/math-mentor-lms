import { supabase } from './supabase'

export interface WeakPoint {
  subject: string
  topic: string
  total: number
  correct: number
  accuracy: number
}

export async function fetchWeakPoints(_userId?: string): Promise<WeakPoint[]> {
  const { data, error } = await supabase.rpc('get_student_weak_points')
  if (error) throw error
  return ((data ?? []) as Array<{
    subject: string
    topic: string
    total: number | string
    correct: number | string
    accuracy: number | string
  }>)
    .map((row) => ({
      subject: row.subject,
      topic: row.topic,
      total: Number(row.total),
      correct: Number(row.correct),
      accuracy: Number(row.accuracy),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
}

export interface SubjectSummary {
  subject: string
  total: number
  correct: number
  accuracy: number
}

export async function fetchSubjectSummary(userId?: string): Promise<SubjectSummary[]> {
  const points = await fetchWeakPoints(userId)

  const acc: Record<string, { total: number; correct: number }> = {}
  for (const p of points) {
    if (!acc[p.subject]) acc[p.subject] = { total: 0, correct: 0 }
    acc[p.subject].total += p.total
    acc[p.subject].correct += p.correct
  }

  return Object.entries(acc)
    .map(([subject, val]) => ({
      subject,
      total: val.total,
      correct: val.correct,
      accuracy: Math.round((val.correct / val.total) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
}
