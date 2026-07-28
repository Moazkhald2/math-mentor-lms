export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'student' | 'teacher' | 'admin'
  class_code?: string
  created_at: string
}

export interface Question {
  id: string
  subject_id: string
  question_text: string
  options: string[]
  correct_answer: number
  difficulty: 1 | 2 | 3 | 4 | 5 | 6
  explanation?: string
}

export interface ExamAttempt {
  id: string
  user_id: string
  session_id: string
  started_at: string
  completed_at?: string
  score?: number
  status: 'in_progress' | 'completed' | 'abandoned'
}