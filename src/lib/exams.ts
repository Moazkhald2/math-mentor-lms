import { supabase } from './supabase'
import type { Exam, ExamQuestion, ExamAttempt, Answer, Question } from '../types'

type ExamInput = Omit<Exam, 'id' | 'created_at' | 'created_by'>

export async function fetchExams() {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Exam[]
}

export async function createExam(input: ExamInput) {
  const { data, error } = await supabase
    .from('exams')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Exam
}

export async function fetchExamQuestions(examId: string) {
  const { data, error } = await supabase
    .from('exam_questions')
    .select('*, question:questions(*)')
    .eq('exam_id', examId)
    .order('order_index')

  if (error) throw error
  return data as (ExamQuestion & { question: import('../types').Question })[]
}

export async function fetchVariantPool(groupIds: string[]) {
  if (groupIds.length === 0) return []
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .in('variant_group_id', groupIds)
    .order('id', { ascending: true })

  if (error) throw error
  return data as Question[]
}

export async function addQuestionToExam(examId: string, questionId: string, orderIndex: number, points = 1) {
  const { data, error } = await supabase
    .from('exam_questions')
    .insert({ exam_id: examId, question_id: questionId, order_index: orderIndex, points })
    .select()
    .single()

  if (error) throw error
  return data as ExamQuestion
}

export async function startAttempt(examId: string, userId: string) {
  const { data, error } = await supabase.rpc('start_exam_attempt', {
    p_exam_id: examId,
    p_user_id: userId,
  })
  if (error) throw error
  return data as ExamAttempt
}

export async function fetchStudentAttempts(examId: string, userId: string) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data as ExamAttempt[]
}

export function getBestScore(attempts: ExamAttempt[]): number {
  return attempts
    .filter(a => a.status === 'completed')
    .reduce((best, a) => Math.max(best, a.score ?? 0), 0)
}

export async function submitAnswer(attemptId: string, questionId: string, answer: string, isCorrect = false, pointsEarned = 0) {
  const { data, error } = await supabase
    .from('answers')
    .upsert({ attempt_id: attemptId, question_id: questionId, answer, is_correct: isCorrect, points_earned: pointsEarned }, { onConflict: 'attempt_id,question_id' })
    .select()
    .single()

  if (error) throw error
  return data as Answer
}

export async function saveAnswer(attemptId: string, questionId: string, answer: string) {
  const { data, error } = await supabase
    .from('answers')
    .upsert({
      attempt_id: attemptId,
      question_id: questionId,
      answer,
      is_correct: false,
      points_earned: 0,
    }, { onConflict: 'attempt_id,question_id' })
    .select()
    .single()

  if (error) throw error
  return data as Answer
}

export async function completeAttempt(attemptId: string, score: number, totalPoints: number) {
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
