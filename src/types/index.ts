export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'student' | 'teacher' | 'admin'
  grade?: number
  class_code?: string
  parent_phone?: string
  telegram_chat_id?: string
  created_at: string
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer'
export type Difficulty = 1 | 2 | 3 | 4
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Easy',
  2: 'Intermediate',
  3: 'Hard',
  4: 'Expert',
}

export interface Question {
  id: string
  type: QuestionType
  subject: string
  topic: string
  difficulty: Difficulty
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string
  image_url: string
  common_mistakes: { mistake: string; why: string; correct: string }[]
  variant_group_id: string | null
  params?: Record<string, { min: number; max: number }> | null
  created_by: string
  created_at: string
}

export interface Exam {
  id: string
  title: string
  description: string
  time_limit_minutes: number
  passing_score: number
  shuffle_questions: boolean
  created_by: string
  created_at: string
  is_published: boolean
  is_important?: boolean
  type: 'exam' | 'practice'
  grade?: number
  starts_at?: string | null
  ends_at?: string | null
  max_attempts: number
  cooldown_hours: number
}

export interface ExamQuestion {
  id: string
  exam_id: string
  question_id: string
  order_index: number
  points: number
}

export interface ExamAttempt {
  id: string
  user_id: string
  exam_id: string
  started_at: string
  completed_at?: string
  score?: number
  total_points: number
  status: 'in_progress' | 'completed' | 'abandoned'
  seed?: string | null
  attempt_number?: number
}

export interface Answer {
  id: string
  attempt_id: string
  question_id: string
  answer: string
  is_correct: boolean
  points_earned: number
  variant_group_id?: string | null
}

export interface ExamWithQuestions extends Exam {
  questions: (ExamQuestion & { question: Question })[]
}

/**
 * Live-exam safe question shape returned by get_exam_questions_safe RPC.
 * Never includes correct_answer, explanation, or common_mistakes.
 */
export type SafeQuestion = Omit<
  Question,
  'correct_answer' | 'explanation' | 'common_mistakes' | 'created_by' | 'created_at'
>

export interface SafeExamQuestionRow extends ExamQuestion {
  question: SafeQuestion
}

export interface SafeExamPayload {
  attempt_id: string
  started_at: string
  server_now: string
  questions: SafeExamQuestionRow[]
  variants: SafeQuestion[]
}

export interface AttemptReviewPayload {
  attempt: ExamAttempt & {
    exam: {
      id?: string
      title: string
      passing_score: number
      max_attempts: number
      type?: 'exam' | 'practice'
    }
  }
  answers: (Answer & { question: Question })[]
}
