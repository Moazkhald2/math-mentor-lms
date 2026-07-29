import { supabase } from './supabase'

export interface WeakPoint {
  subject: string
  topic: string
  total: number
  correct: number
  accuracy: number
}

export async function fetchWeakPoints(userId: string): Promise<WeakPoint[]> {
  const { data: attempts, error: attemptsError } = await supabase
    .from('exam_attempts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (attemptsError) throw attemptsError
  if (!attempts?.length) return []

  const attemptIds = attempts.map(a => a.id)

  const { data: answers, error: answersError } = await supabase
    .from('answers')
    .select('question_id, is_correct')
    .in('attempt_id', attemptIds)

  if (answersError) throw answersError
  if (!answers?.length) return []

  const qIds = [...new Set(answers.map(a => a.question_id))]

  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('id, subject, topic')
    .in('id', qIds)

  if (qError) throw qError

  const qMap = new Map(questions?.map(q => [q.id, q]) ?? [])

  const acc: Record<string, { total: number; correct: number }> = {}

  for (const a of answers) {
    const q = qMap.get(a.question_id)
    if (!q) continue
    const key = `${q.subject}::${q.topic}`
    if (!acc[key]) acc[key] = { total: 0, correct: 0 }
    acc[key].total++
    if (a.is_correct) acc[key].correct++
  }

  return Object.entries(acc)
    .map(([key, val]) => {
      const [subject, topic] = key.split('::')
      return { subject, topic, total: val.total, correct: val.correct, accuracy: Math.round((val.correct / val.total) * 100) }
    })
    .sort((a, b) => a.accuracy - b.accuracy)
}

export interface SubjectSummary {
  subject: string
  total: number
  correct: number
  accuracy: number
}

export async function fetchSubjectSummary(userId: string): Promise<SubjectSummary[]> {
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
