import { supabase } from './supabase'
import type { ExamAttempt, Answer, ExamQuestion, Question } from '../types'

/**
 * Fetches questions for a published practice sheet via safe server RPC.
 * The RPC strictly rejects live exams (type != 'practice').
 */
export async function fetchPracticeQuestionsSafe(examId: string) {
  const { data, error } = await supabase.rpc('get_practice_questions_safe', {
    p_exam_id: examId,
  })
  if (error) throw error
  return (data ?? []) as (ExamQuestion & { question: Question })[]
}

export async function startPractice(examId: string, _userId?: string) {
  const { data, error } = await supabase.rpc('start_practice_attempt', {
    p_exam_id: examId,
  })
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
  const { data, error } = await supabase.rpc('upsert_practice_answer', {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_answer: answer,
    p_is_correct: isCorrect,
    p_points_earned: pointsEarned,
  })
  if (error) throw error
  return data as Answer
}

export async function finishPractice(attemptId: string, score: number, totalPoints: number) {
  const { data, error } = await supabase.rpc('finish_practice_attempt', {
    p_attempt_id: attemptId,
    p_score: score,
    p_total_points: totalPoints,
  })
  if (error) throw error
  return data as ExamAttempt
}
