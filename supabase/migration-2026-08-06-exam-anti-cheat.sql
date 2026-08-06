-- Exam anti-cheat & attempts: variants, max attempts, cooldown, per-attempt seed.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS variant_group_id TEXT;
CREATE INDEX IF NOT EXISTS idx_questions_variant_group
  ON public.questions(variant_group_id);

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS cooldown_hours INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS seed TEXT;
ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER;
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_exam
  ON public.exam_attempts(exam_id, user_id);

CREATE OR REPLACE FUNCTION public.start_exam_attempt(p_exam_id UUID, p_user_id UUID)
RETURNS public.exam_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_exam public.exams%ROWTYPE;
  v_count INTEGER;
  v_last public.exam_attempts%ROWTYPE;
  v_attempt public.exam_attempts;
BEGIN
  SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam_not_found';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.exam_attempts
    WHERE exam_id = p_exam_id AND user_id = p_user_id AND status = 'completed';

  IF v_count >= v_exam.max_attempts THEN
    RAISE EXCEPTION 'exam_no_attempts_left';
  END IF;

  SELECT * INTO v_last
    FROM public.exam_attempts
    WHERE exam_id = p_exam_id AND user_id = p_user_id AND status = 'completed'
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 1;

  IF v_last.id IS NOT NULL AND v_exam.cooldown_hours > 0
     AND v_last.completed_at + make_interval(hours => v_exam.cooldown_hours) > now() THEN
    RAISE EXCEPTION 'exam_cooldown_active';
  END IF;

  INSERT INTO public.exam_attempts (exam_id, user_id, started_at, status, seed, attempt_number)
  VALUES (p_exam_id, p_user_id, now(), 'in_progress', gen_random_uuid()::text, v_count + 1)
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;