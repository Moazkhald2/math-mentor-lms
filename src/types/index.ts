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
export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Easy',
  2: 'Intermediate',
  3: 'Hard',
  4: 'Expert',
  5: 'Extreme',
  6: 'Above',
}

/**
 * Alias for the shared 1-6 difficulty scale.
 * NOTE: `question_concepts.difficulty_tier` is the authoritative per-concept
 * difficulty; `questions.difficulty` is the overall/legacy tier.
 */
export type DifficultyTier = Difficulty

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
  family_id?: string | null
  hints?: string[] | null
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

// ---------------------------------------------------------------------------
// Concept / outcome taxonomy (migration-2026-11-20-outcome-taxonomy.sql)
// ---------------------------------------------------------------------------

export type ConceptDomain = 'NUM' | 'ALG' | 'MEA' | 'GEO' | 'STA' | 'DAT'
export type ConceptStatus = 'active' | 'deprecated'

export interface ConceptAlias {
  alias: string
  source: string
  lang: string
}

export interface Concept {
  concept_id: string
  label: string
  description: string | null
  domain: ConceptDomain
  grade_band_low: number
  grade_band_high: number
  unit_hint: string | null
  aliases: ConceptAlias[]
  prerequisite_concept_ids: string[]
  status: ConceptStatus
  superseded_by: string | null
  created_by: string | null
  created_at: string
}

export type CurriculumStatus = 'draft' | 'pilot' | 'active' | 'archived'

export interface Curriculum {
  id: string
  display_name: string
  country: string | null
  version: string | null
  academic_year: string | null
  term: string | null
  status: CurriculumStatus
  source_ref: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CurriculumOutcome {
  id: number
  curriculum_id: string
  outcome_code: string
  grade: number
  stage: string | null
  unit_code: string | null
  lesson_no: number | null
  lesson_date: string | null
  text: string | null
  source_pages: string | null
  pedagogy: Record<string, unknown>
}

export type OutcomeMappingKind = 'primary' | 'supporting'

export interface CurriculumOutcomeConcept {
  curriculum_id: string
  outcome_code: string
  concept_id: string
  mapping_kind: OutcomeMappingKind
  confidence: number | null
}

export type ConceptMappingSource = 'auto_keyword' | 'manual' | 'ai_generated' | 'reviewed'

export interface QuestionConcept {
  id: string
  question_id: string
  concept_id: string
  /** Authoritative per-concept difficulty on the shared 1-6 scale. */
  difficulty_tier: DifficultyTier
  is_primary: boolean
  mapping_source: ConceptMappingSource
  confidence: number | null
  reviewed_by: string | null
  reviewed_at: string | null
}
