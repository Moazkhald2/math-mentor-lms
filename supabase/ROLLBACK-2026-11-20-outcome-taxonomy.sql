-- =============================================================================
-- Rollback for migration-2026-11-20-outcome-taxonomy.sql
-- Drops the 5 taxonomy tables in reverse dependency order and restores the
-- original questions.difficulty CHECK (1-4) / INTEGER type.
-- Note: public.get_current_user_role() is intentionally NOT dropped — it may
--       predate this migration and is used by other policies/functions.
-- =============================================================================

-- 5. question_concepts (depends on concepts + questions)
DROP TABLE IF EXISTS public.question_concepts;

-- 4. curriculum_outcome_concepts (depends on concepts + curriculum_outcomes)
DROP TABLE IF EXISTS public.curriculum_outcome_concepts;

-- 3. curriculum_outcomes (depends on curricula)
DROP TABLE IF EXISTS public.curriculum_outcomes;

-- 2. curricula
DROP TABLE IF EXISTS public.curricula;

-- 1. concepts (self-referencing; depended on by the two bridges above)
DROP TABLE IF EXISTS public.concepts;

-- Restore questions.difficulty to the legacy INTEGER 1-4 shape.
-- Clamp any widened values first so the restored CHECK can succeed.
UPDATE public.questions
SET difficulty = 4
WHERE difficulty > 4;

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_difficulty_check_v2;
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_difficulty_check;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_difficulty_check CHECK (difficulty BETWEEN 1 AND 4);

COMMENT ON COLUMN public.questions.difficulty IS NULL;
