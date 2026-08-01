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
}

export interface Answer {
  id: string
  attempt_id: string
  question_id: string
  answer: string
  is_correct: boolean
  points_earned: number
}

export interface ExamWithQuestions extends Exam {
  questions: (ExamQuestion & { question: Question })[]
}
