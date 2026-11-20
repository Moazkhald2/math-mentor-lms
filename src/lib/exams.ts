import { supabase } from './supabase'
import { getOrCreateClientSessionToken } from './session'
import type {
  Exam,
  ExamQuestion,
  ExamAttempt,
  Answer,
  Question,
  SafeExamPayload,
  AttemptReviewPayload,
} from '../types'

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

export function cooldownRemainingMs(exam: Pick<Exam, 'cooldown_hours'>, attempts: ExamAttempt[]): number {
  const last = attempts.filter(a => a.status === 'completed')
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0]
  if (!last || !exam.cooldown_hours) return 0
  return Math.max(0, new Date(last.completed_at!).getTime()
    + exam.cooldown_hours * 3600e3 - Date.now())
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

const NON_RETRYABLE_ERROR_PATTERNS = [
  'attempt_already_submitted',
  'session_conflict_other_device',
  'unauthorized',
  'rate_limit_exceeded',
  'exam_not_started',
  'exam_ended',
  'exam_time_expired',
  'exam_time_limit_exceeded',
  'exam_submission_window_closed',
  'exam_no_attempts_left',
  'exam_cooldown_active',
  'exam_grade_mismatch',
  '23505',
]

function isNonRetryableError(err: unknown): boolean {
  const msg = String((err as { message?: string; code?: string })?.message ?? err ?? '').toLowerCase()
  const code = String((err as { code?: string })?.code ?? '').toLowerCase()
  return NON_RETRYABLE_ERROR_PATTERNS.some((p) => msg.includes(p) || code.includes(p))
}

/**
 * Exponential backoff with random jitter to gracefully absorb transient load spikes.
 * Skips retries for deterministic server authorization/timing/uniqueness rejections.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test' ? 1 : 3,
  baseDelayMs = 250
): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err) {
      attempt++
      if (attempt >= retries || isNonRetryableError(err)) throw err
      const jitter = Math.random() * 200
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

/**
 * Student live-exam question fetcher.
 * Calls SECURITY DEFINER RPC get_exam_questions_safe, which requires an active,
 * owned attempt and NEVER returns correct_answer, explanation, or common_mistakes.
 */
export async function fetchExamQuestionsSafe(
  examId: string,
  attemptId: string
): Promise<SafeExamPayload> {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase.rpc('get_exam_questions_safe', {
      p_exam_id: examId,
      p_attempt_id: attemptId,
      p_session_token: getOrCreateClientSessionToken(),
    })
    if (error) throw error
    return data as SafeExamPayload
  })
}

/**
 * Authorized post-submission review fetcher.
 * Only succeeds for the owner after status = 'completed' (or for teachers/admins).
 */
export async function fetchAttemptReviewSafe(
  attemptId: string
): Promise<AttemptReviewPayload> {
  const { data, error } = await supabase.rpc('get_attempt_review_safe', {
    p_attempt_id: attemptId,
  })
  if (error) throw error
  return data as AttemptReviewPayload
}

export async function saveAnswersBatch(attemptId: string, answersMap: Record<string, string>) {
  return retryWithBackoff(async () => {
    const payload = Object.entries(answersMap).map(([questionId, answer]) => ({
      question_id: questionId,
      answer,
    }))
    if (payload.length === 0) return { saved: 0 }
    const { data, error } = await supabase.rpc('save_attempt_answers_draft', {
      p_attempt_id: attemptId,
      p_answers: payload,
      p_session_token: getOrCreateClientSessionToken(),
    })
    if (error) throw error
    return (data ?? { saved: payload.length }) as { saved: number }
  })
}

export async function submitAnswersBatch(
  attemptId: string,
  answersList: Array<{ questionId: string; answer: string; isCorrect: boolean; pointsEarned: number }>
) {
  return retryWithBackoff(async () => {
    const entries = answersList.map(a => ({
      attempt_id: attemptId,
      question_id: a.questionId,
      answer: a.answer,
      is_correct: a.isCorrect,
      points_earned: a.pointsEarned,
    }))
    if (entries.length === 0) return []
    const { data, error } = await supabase
      .from('answers')
      .upsert(entries, { onConflict: 'attempt_id,question_id' })
      .select()

    if (error) throw error
    return (data ?? []) as Answer[]
  })
}

export async function completeAttempt(attemptId: string, score: number, totalPoints: number) {
  return retryWithBackoff(async () => {
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
  })
}

export async function submitExamSecure(attemptId: string, answersMap: Record<string, string>) {
  return retryWithBackoff(async () => {
    const payload = Object.entries(answersMap).map(([questionId, ans]) => ({
      question_id: questionId,
      answer: ans,
    }))
    const { data, error } = await supabase.rpc('submit_exam_attempt_secure', {
      p_attempt_id: attemptId,
      p_answers: payload,
      p_session_token: getOrCreateClientSessionToken(),
    })
    if (error) throw error
    return data as { score: number; total_points: number; earned_points: number; status: string }
  })
}
