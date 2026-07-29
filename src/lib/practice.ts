import { supabase } from './supabase'
import type { ExamAttempt, Answer } from '../types'

export async function startPractice(examId: string, userId: string) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .insert({
      exam_id: examId,
      user_id: userId,
      started_at: new Date().toISOString(),
      status: 'in_progress',
    })
    .select()
    .single()

  if (error) throw error
  return data as ExamAttempt
}

export async function upsertAnswer(
  attemptId: string,
  questionId: string,
  answer: string,
  isCorrect = false,
  pointsEarned = 0
) {
  const { data, error } = await supabase
    .from('answers')
    .upsert({
      attempt_id: attemptId,
      question_id: questionId,
      answer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
    })
    .select()
    .single()

  if (error) throw error
  return data as Answer
}

export async function finishPractice(attemptId: string, score: number, totalPoints: number) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .update({
      completed_at: new Date().toISOString(),
      score,
      total_points: totalPoints,
      status: 'completed',
    })
    .eq('id', attemptId)
    .select()
    .single()

  if (error) throw error
  return data as ExamAttempt
}
