import { supabase } from './supabase'
import type { ExamAttempt, Answer, ExamQuestion, Question } from '../types'

export interface SavedPracticeAnswer {
  answer: string
  isCorrect: boolean
}

export interface PracticeCheckpoint {
  attemptId: string
  examId: string
  userId: string
  currentIndex: number
  totalQuestions: number
  answeredMap: Record<string, SavedPracticeAnswer>
  updatedAt: string
}

export interface PracticeSheetProgress {
  examId: string
  attemptId: string
  answeredCount: number
  totalQuestions: number | null
  currentIndex: number
  updatedAt: string
}

const CHECKPOINT_PREFIX = 'mm_practice_cp_'

export function practiceCheckpointKey(userId: string, examId: string): string {
  return `${CHECKPOINT_PREFIX}${userId}_${examId}`
}

export function savePracticeCheckpoint(cp: PracticeCheckpoint): void {
  try {
    localStorage.setItem(practiceCheckpointKey(cp.userId, cp.examId), JSON.stringify(cp))
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export function loadPracticeCheckpoint(userId: string, examId: string): PracticeCheckpoint | null {
  try {
    const raw = localStorage.getItem(practiceCheckpointKey(userId, examId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PracticeCheckpoint
    if (!parsed || typeof parsed !== 'object' || parsed.examId !== examId || parsed.userId !== userId) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearPracticeCheckpoint(userId: string, examId: string): void {
  try {
    localStorage.removeItem(practiceCheckpointKey(userId, examId))
  } catch {
    // Ignore storage errors
  }
}

export function listLocalPracticeCheckpoints(userId: string): Record<string, PracticeCheckpoint> {
  const result: Record<string, PracticeCheckpoint> = {}
  const prefix = `${CHECKPOINT_PREFIX}${userId}_`
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(prefix)) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as PracticeCheckpoint
      if (parsed && parsed.examId && parsed.userId === userId) {
        result[parsed.examId] = parsed
      }
    }
  } catch {
    // Ignore storage errors
  }
  return result
}

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

/**
 * Checks if the student already has an in-progress practice attempt for this sheet
 * on Supabase and returns it along with its saved answers.
 */
export async function fetchInProgressPracticeAttempt(
  examId: string,
  userId: string
): Promise<{ attempt: ExamAttempt; answers: Pick<Answer, 'question_id' | 'answer' | 'is_correct'>[] } | null> {
  const { data: attempts, error: attErr } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)

  if (attErr || !attempts || attempts.length === 0) return null

  const attempt = attempts[0] as ExamAttempt
  const { data: ansRows, error: ansErr } = await supabase
    .from('answers')
    .select('question_id, answer, is_correct')
    .eq('attempt_id', attempt.id)

  if (ansErr) {
    return { attempt, answers: [] }
  }

  return {
    attempt,
    answers: (ansRows ?? []) as Pick<Answer, 'question_id' | 'answer' | 'is_correct'>[],
  }
}

/**
 * Resumes an existing in-progress practice attempt if one exists;
 * otherwise creates a fresh one via startPractice.
 */
export async function resumeOrStartPractice(
  examId: string,
  userId: string
): Promise<{
  attempt: ExamAttempt
  answers: Pick<Answer, 'question_id' | 'answer' | 'is_correct'>[]
  resumed: boolean
}> {
  const existing = await fetchInProgressPracticeAttempt(examId, userId)
  if (existing) {
    return { ...existing, resumed: true }
  }
  const attempt = await startPractice(examId, userId)
  return { attempt, answers: [], resumed: false }
}

/**
 * Fetches in-progress practice progress across a list of practice sheets
 * by merging Supabase in_progress attempts + local checkpoints.
 */
export async function fetchUserPracticeProgress(
  userId: string,
  examIds: string[]
): Promise<Record<string, PracticeSheetProgress>> {
  const progressMap: Record<string, PracticeSheetProgress> = {}
  const localCheckpoints = listLocalPracticeCheckpoints(userId)

  for (const examId of examIds) {
    const cp = localCheckpoints[examId]
    if (cp) {
      progressMap[examId] = {
        examId,
        attemptId: cp.attemptId,
        answeredCount: Object.keys(cp.answeredMap ?? {}).length,
        totalQuestions: cp.totalQuestions > 0 ? cp.totalQuestions : null,
        currentIndex: cp.currentIndex ?? 0,
        updatedAt: cp.updatedAt,
      }
    }
  }

  if (examIds.length === 0) return progressMap

  try {
    const { data: attempts, error: attErr } = await supabase
      .from('exam_attempts')
      .select('id, exam_id, started_at, status')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .in('exam_id', examIds)
      .order('started_at', { ascending: false })

    if (attErr || !attempts || attempts.length === 0) return progressMap

    // Keep the most recent in_progress attempt per exam_id
    const latestByExam = new Map<string, { id: string; exam_id: string; started_at: string }>()
    for (const a of attempts as Array<{ id: string; exam_id: string; started_at: string }>) {
      if (!latestByExam.has(a.exam_id)) {
        latestByExam.set(a.exam_id, a)
      }
    }

    const attemptIds = Array.from(latestByExam.values()).map((a) => a.id)
    const answerCounts = new Map<string, number>()

    if (attemptIds.length > 0) {
      const { data: ansRows } = await supabase
        .from('answers')
        .select('attempt_id, question_id')
        .in('attempt_id', attemptIds)

      for (const row of (ansRows ?? []) as Array<{ attempt_id: string; question_id: string }>) {
        answerCounts.set(row.attempt_id, (answerCounts.get(row.attempt_id) ?? 0) + 1)
      }
    }

    for (const [examId, att] of latestByExam.entries()) {
      const serverAnswered = answerCounts.get(att.id) ?? 0
      const local = progressMap[examId]
      const answeredCount = Math.max(serverAnswered, local?.answeredCount ?? 0)
      progressMap[examId] = {
        examId,
        attemptId: att.id,
        answeredCount,
        totalQuestions: local?.totalQuestions ?? null,
        currentIndex: local?.currentIndex ?? answeredCount,
        updatedAt: local?.updatedAt ?? att.started_at,
      }
    }
  } catch {
    // Fall back gracefully to local checkpoints if network is unavailable
  }

  return progressMap
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
