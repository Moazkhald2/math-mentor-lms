-- Add unique constraint on (attempt_id, question_id) to enable upserts
ALTER TABLE public.answers
ADD CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id);
