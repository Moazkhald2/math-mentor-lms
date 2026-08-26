-- migration-006: parameterized question templates
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS params JSONB;

COMMENT ON COLUMN public.questions.params IS 'Optional template spec, e.g. {"a":{"min":2,"max":9},"b":{"min":1,"max":5}}. When present, {var} tokens in question_text/options/correct_answer are substituted with seeded values.';

-- RLS unchanged (column inherits table policies).
-- Rollback: ALTER TABLE public.questions DROP COLUMN IF EXISTS params;
