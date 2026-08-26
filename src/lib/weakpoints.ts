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
    .select('is_correct, question:questions(id, subject, topic), question_id')
    .in('attempt_id', attemptIds)

  if (answersError) throw answersError
  if (!answers?.length) return []

  // Check if join succeeded (has subject). If not, fallback to separate question fetch for compat
  const hasJoin = (answers[0] as any)?.question && ((answers[0] as any).question.subject || (Array.isArray((answers[0] as any).question) && (answers[0] as any).question[0]?.subject))

  let qMap = new Map<string, { subject: string; topic: string }>()
  if (!hasJoin) {
    const qIds = [...new Set((answers as any[]).map(a => a.question_id).filter(Boolean))]
    if (qIds.length) {
      const { data: questions, error: qError } = await supabase.from('questions').select('id, subject, topic').in('id', qIds)
      if (qError) throw qError
      qMap = new Map((questions ?? []).map(q => [q.id, q]) as any)
    }
  }

  const acc: Record<string, { total: number; correct: number }> = {}
  for (const a of answers as any[]) {
    let q = Array.isArray(a.question) ? a.question[0] : a.question
    if (!q?.subject && a.question_id) q = qMap.get(a.question_id)
    if (!q?.subject) continue
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
