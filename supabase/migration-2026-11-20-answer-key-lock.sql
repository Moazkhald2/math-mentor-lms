-- =============================================================================
-- Migration: Step 3 — Server-Side Answer-Key Lock, Timing Validation & Race Guard
-- Date: 2026-11-20
-- Safe to run multiple times (idempotent & self-healing for missing prereq tables).
-- Matching rollback: supabase/ROLLBACK-2026-11-20-answer-key-lock.sql
-- Matching 4-role test: supabase/TEST-2026-11-20-rls-4-roles.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Ensure Prerequisite Columns & Tables Exist (Idempotent Safety Guard)
-- -----------------------------------------------------------------------------
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS variant_group_id TEXT,
  ADD COLUMN IF NOT EXISTS params JSONB,
  ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS common_mistakes JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS cooldown_hours INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'exam',
  ADD COLUMN IF NOT EXISTS grade INTEGER;

ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS seed TEXT,
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER;

CREATE TABLE IF NOT EXISTS public.question_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
ALTER TABLE public.question_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.question_bookmarks;
CREATE POLICY "Users can manage own bookmarks"
  ON public.question_bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.question_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'confusing', 'typo', 'other')),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);
ALTER TABLE public.question_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own feedback" ON public.question_feedback;
CREATE POLICY "Users can manage own feedback"
  ON public.question_feedback FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 1. Hardened Role Helper & Prevent Profile Role Self-Escalation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'anon';
  END IF;
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(v_role, 'student');
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'student';
END;
$$;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'student');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_current_user_role()
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 2. Lock Down public.questions & public.exam_questions (NO Student/Anon SELECT)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read questions" ON public.questions;
DROP POLICY IF EXISTS "Teachers can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Teachers can update questions" ON public.questions;
DROP POLICY IF EXISTS "Teachers can delete questions" ON public.questions;
DROP POLICY IF EXISTS "Staff can read all questions" ON public.questions;
DROP POLICY IF EXISTS "Staff can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Staff can update questions" ON public.questions;
DROP POLICY IF EXISTS "Staff can delete questions" ON public.questions;

CREATE POLICY "Staff can read all questions"
  ON public.questions FOR SELECT
  USING (public.get_current_user_role() IN ('teacher', 'admin'));

CREATE POLICY "Staff can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

CREATE POLICY "Staff can update questions"
  ON public.questions FOR UPDATE
  USING (public.get_current_user_role() IN ('teacher', 'admin'))
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

CREATE POLICY "Staff can delete questions"
  ON public.questions FOR DELETE
  USING (public.get_current_user_role() IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Anyone can read exam questions" ON public.exam_questions;
DROP POLICY IF EXISTS "Staff can manage exam questions" ON public.exam_questions;

CREATE POLICY "Staff can manage exam questions"
  ON public.exam_questions FOR ALL
  USING (public.get_current_user_role() IN ('teacher', 'admin'))
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

-- -----------------------------------------------------------------------------
-- 3. Lock Down Direct Student Score / Answer Tampering
--    Students can SELECT their own attempts/answers, but ALL mutations MUST go
--    through server-authorized SECURITY DEFINER RPCs below.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can update own attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Users can insert own answers" ON public.answers;
DROP POLICY IF EXISTS "Users can update own answers" ON public.answers;

DROP POLICY IF EXISTS "Staff can manage exam attempts" ON public.exam_attempts;
CREATE POLICY "Staff can manage exam attempts"
  ON public.exam_attempts FOR ALL
  USING (public.get_current_user_role() IN ('teacher', 'admin'))
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Staff can manage answers" ON public.answers;
CREATE POLICY "Staff can manage answers"
  ON public.answers FOR ALL
  USING (public.get_current_user_role() IN ('teacher', 'admin'))
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

-- Ensure UNIQUE (attempt_id, question_id) exists on answers for safe upsert
CREATE UNIQUE INDEX IF NOT EXISTS answers_attempt_question_uidx
  ON public.answers (attempt_id, question_id);

-- -----------------------------------------------------------------------------
-- 4. Primary DB Submission Uniqueness Table + Application-Level RPC Rate Limit
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  accepted BOOLEAN NOT NULL DEFAULT true,
  score INTEGER NOT NULL,
  earned_points INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_submissions ENABLE ROW LEVEL SECURITY;

-- Primary DB-level single-final-submission uniqueness guarantee
CREATE UNIQUE INDEX IF NOT EXISTS exam_submissions_attempt_unique
  ON public.exam_submissions (exam_attempt_id)
  WHERE accepted = true;

CREATE INDEX IF NOT EXISTS idx_exam_submissions_user_time
  ON public.exam_submissions (user_id, submitted_at DESC);

DROP POLICY IF EXISTS "Users can read own submissions" ON public.exam_submissions;
CREATE POLICY "Users can read own submissions"
  ON public.exam_submissions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can read all submissions" ON public.exam_submissions;
CREATE POLICY "Staff can read all submissions"
  ON public.exam_submissions FOR SELECT
  USING (public.get_current_user_role() IN ('teacher', 'admin'));

-- Internal RPC rate limit log (no client RLS policies -> inaccessible directly)
CREATE TABLE IF NOT EXISTS public.rpc_rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rpc_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rpc_rate_limits_lookup
  ON public.rpc_rate_limits (user_id, action, created_at DESC);

CREATE OR REPLACE FUNCTION public.check_rpc_rate_limit(
  p_action TEXT,
  p_max_calls INT,
  p_window_seconds INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_recent_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT COUNT(*) INTO v_recent_count
  FROM public.rpc_rate_limits
  WHERE user_id = v_uid
    AND action = p_action
    AND created_at >= now() - make_interval(secs => p_window_seconds);

  IF v_recent_count >= p_max_calls THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;

  INSERT INTO public.rpc_rate_limits (user_id, action, created_at)
  VALUES (v_uid, p_action, now());

  -- Keep table tiny by opportunistically trimming caller's expired rows
  DELETE FROM public.rpc_rate_limits
  WHERE user_id = v_uid
    AND action = p_action
    AND created_at < now() - interval '1 hour';
END;
$$;

REVOKE ALL ON FUNCTION public.check_rpc_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Helper: Server-Side Math Answer Normalization
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_math_answer(p_raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT;
BEGIN
  v := LOWER(TRIM(COALESCE(p_raw, '')));
  -- Remove whitespace inside math expressions
  v := REGEXP_REPLACE(v, '\s+', '', 'g');
  -- Normalize simple LaTeX \frac{a}{b} -> a/b
  v := REGEXP_REPLACE(v, '\\frac\{([^{}]+)\}\{([^{}]+)\}', '(\1)/(\2)', 'g');
  -- Normalize \left / \right wrappers
  v := REPLACE(REPLACE(v, '\left', ''), '\right', '');
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.answers_match_server(
  p_q_type TEXT,
  p_student_ans TEXT,
  p_correct_ans TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_s TEXT;
  v_c TEXT;
  v_sn NUMERIC;
  v_cn NUMERIC;
BEGIN
  IF p_q_type = 'short_answer' THEN
    v_s := public.normalize_math_answer(p_student_ans);
    v_c := public.normalize_math_answer(p_correct_ans);
    IF v_s = '' THEN
      RETURN FALSE;
    END IF;
    IF v_s = v_c THEN
      RETURN TRUE;
    END IF;
    -- Numeric equivalence (e.g. 4.0 vs 4, 0.5 vs .5)
    IF v_s ~ '^-?[0-9]*\.?[0-9]+$' AND v_c ~ '^-?[0-9]*\.?[0-9]+$' THEN
      v_sn := v_s::NUMERIC;
      v_cn := v_c::NUMERIC;
      RETURN ABS(v_sn - v_cn) <= 0.0001;
    END IF;
    RETURN FALSE;
  ELSE
    RETURN LOWER(TRIM(COALESCE(p_student_ans, ''))) = LOWER(TRIM(COALESCE(p_correct_ans, '')));
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. Hardened start_exam_attempt (Server-Authoritative Timing, Ownership & Resume)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.start_exam_attempt(UUID, UUID);
CREATE OR REPLACE FUNCTION public.start_exam_attempt(
  p_exam_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS public.exam_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_grade INTEGER;
  v_exam public.exams%ROWTYPE;
  v_existing public.exam_attempts%ROWTYPE;
  v_count INTEGER;
  v_last public.exam_attempts%ROWTYPE;
  v_attempt public.exam_attempts;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id != v_uid THEN
    RAISE EXCEPTION 'unauthorized_user_mismatch';
  END IF;

  SELECT role, grade INTO v_role, v_grade
  FROM public.profiles
  WHERE id = v_uid;

  SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam_not_found';
  END IF;

  IF NOT v_exam.is_published AND COALESCE(v_role, 'student') NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'exam_not_published';
  END IF;

  IF COALESCE(v_role, 'student') = 'student'
     AND v_exam.grade IS NOT NULL
     AND v_grade IS NOT NULL
     AND v_exam.grade != v_grade THEN
    RAISE EXCEPTION 'exam_grade_mismatch';
  END IF;

  -- Server-authoritative open/close window validation for exams
  IF v_exam.type = 'exam' THEN
    IF v_exam.starts_at IS NOT NULL AND now() < v_exam.starts_at THEN
      RAISE EXCEPTION 'exam_not_started';
    END IF;
    IF v_exam.ends_at IS NOT NULL AND now() > v_exam.ends_at THEN
      RAISE EXCEPTION 'exam_ended';
    END IF;
  END IF;

  -- Refresh recovery: resume existing valid in_progress attempt instead of creating duplicates
  SELECT * INTO v_existing
  FROM public.exam_attempts
  WHERE exam_id = p_exam_id
    AND user_id = v_uid
    AND status = 'in_progress'
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    IF v_exam.type != 'exam'
       OR v_exam.time_limit_minutes IS NULL
       OR v_exam.time_limit_minutes <= 0
       OR now() <= v_existing.started_at + make_interval(mins => v_exam.time_limit_minutes) + interval '120 seconds' THEN
      RETURN v_existing;
    ELSE
      -- Previous attempt expired silently; mark abandoned so limits apply accurately
      UPDATE public.exam_attempts
      SET status = 'abandoned', completed_at = now()
      WHERE id = v_existing.id;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.exam_attempts
  WHERE exam_id = p_exam_id AND user_id = v_uid AND status = 'completed';

  IF v_exam.type = 'exam' AND v_count >= COALESCE(v_exam.max_attempts, 3) THEN
    RAISE EXCEPTION 'exam_no_attempts_left';
  END IF;

  SELECT * INTO v_last
  FROM public.exam_attempts
  WHERE exam_id = p_exam_id AND user_id = v_uid AND status = 'completed'
  ORDER BY completed_at DESC NULLS LAST
  LIMIT 1;

  IF v_exam.type = 'exam'
     AND v_last.id IS NOT NULL
     AND COALESCE(v_exam.cooldown_hours, 0) > 0
     AND v_last.completed_at + make_interval(hours => v_exam.cooldown_hours) > now() THEN
    RAISE EXCEPTION 'exam_cooldown_active';
  END IF;

  INSERT INTO public.exam_attempts (exam_id, user_id, started_at, status, seed, attempt_number)
  VALUES (p_exam_id, v_uid, now(), 'in_progress', gen_random_uuid()::text, v_count + 1)
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;

REVOKE ALL ON FUNCTION public.start_exam_attempt(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_exam_attempt(UUID, UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 7. Safe Live-Exam Question Fetcher (ZERO correct_answer / explanation)
--    Callable ONLY by an authenticated student with an active, owned attempt.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_exam_questions_safe(
  p_exam_id UUID,
  p_attempt_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_attempt public.exam_attempts%ROWTYPE;
  v_exam public.exams%ROWTYPE;
  v_questions JSONB;
  v_variants JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Must hold an active, authorized in_progress attempt for this exact exam
  SELECT * INTO v_attempt
  FROM public.exam_attempts
  WHERE id = p_attempt_id
    AND exam_id = p_exam_id
    AND user_id = v_uid
    AND status = 'in_progress';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unauthorized_or_inactive_attempt';
  END IF;

  SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam_not_found';
  END IF;

  -- Server-authoritative timing checks for live exams
  IF v_exam.type = 'exam' THEN
    IF v_exam.starts_at IS NOT NULL AND now() < v_exam.starts_at THEN
      RAISE EXCEPTION 'exam_not_started';
    END IF;
    IF v_exam.ends_at IS NOT NULL AND now() > v_exam.ends_at + interval '120 seconds' THEN
      RAISE EXCEPTION 'exam_ended';
    END IF;
    IF v_exam.time_limit_minutes IS NOT NULL
       AND v_exam.time_limit_minutes > 0
       AND now() > v_attempt.started_at + make_interval(mins => v_exam.time_limit_minutes) + interval '120 seconds' THEN
      RAISE EXCEPTION 'exam_time_expired';
    END IF;
  END IF;

  -- Project ONLY non-sensitive columns (NO correct_answer, NO explanation, NO common_mistakes)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', eq.id,
        'exam_id', eq.exam_id,
        'question_id', eq.question_id,
        'order_index', eq.order_index,
        'points', eq.points,
        'question', jsonb_build_object(
          'id', q.id,
          'type', q.type,
          'subject', q.subject,
          'topic', q.topic,
          'difficulty', q.difficulty,
          'question_text', q.question_text,
          'options', q.options,
          'image_url', q.image_url,
          'variant_group_id', q.variant_group_id,
          'params', q.params
        )
      )
      ORDER BY eq.order_index ASC
    ),
    '[]'::jsonb
  ) INTO v_questions
  FROM public.exam_questions eq
  JOIN public.questions q ON q.id = eq.question_id
  WHERE eq.exam_id = p_exam_id;

  -- Safe variant pool (also stripped of correct_answer / explanation / common_mistakes)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'type', q.type,
        'subject', q.subject,
        'topic', q.topic,
        'difficulty', q.difficulty,
        'question_text', q.question_text,
        'options', q.options,
        'image_url', q.image_url,
        'variant_group_id', q.variant_group_id,
        'params', q.params
      )
      ORDER BY q.id ASC
    ),
    '[]'::jsonb
  ) INTO v_variants
  FROM public.questions q
  WHERE q.variant_group_id IS NOT NULL
    AND q.variant_group_id IN (
      SELECT DISTINCT q2.variant_group_id
      FROM public.exam_questions eq2
      JOIN public.questions q2 ON q2.id = eq2.question_id
      WHERE eq2.exam_id = p_exam_id
        AND q2.variant_group_id IS NOT NULL
    );

  RETURN jsonb_build_object(
    'attempt_id', v_attempt.id,
    'started_at', v_attempt.started_at,
    'server_now', now(),
    'questions', v_questions,
    'variants', v_variants
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_exam_questions_safe(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_exam_questions_safe(UUID, UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 8. Safe Draft Answer Saver (In-Progress Only, Never Grades)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_attempt_answers_draft(
  p_attempt_id UUID,
  p_answers JSONB -- Array of {"question_id": "...", "answer": "..."}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_attempt public.exam_attempts%ROWTYPE;
  v_item JSONB;
  v_q_id UUID;
  v_ans TEXT;
  v_saved_count INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_attempt
  FROM public.exam_attempts
  WHERE id = p_attempt_id
    AND user_id = v_uid
    AND status = 'in_progress';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unauthorized_or_inactive_attempt';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb))
  LOOP
    v_q_id := (v_item->>'question_id')::UUID;
    v_ans := COALESCE(v_item->>'answer', '');

    -- Only accept question IDs belonging to this exam or its variant groups
    IF EXISTS (
      SELECT 1
      FROM public.exam_questions eq
      JOIN public.questions q ON q.id = eq.question_id
      WHERE eq.exam_id = v_attempt.exam_id
        AND (
          eq.question_id = v_q_id
          OR (
            q.variant_group_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.questions qv
              WHERE qv.id = v_q_id AND qv.variant_group_id = q.variant_group_id
            )
          )
        )
    ) THEN
      INSERT INTO public.answers (attempt_id, question_id, answer, is_correct, points_earned)
      VALUES (p_attempt_id, v_q_id, v_ans, false, 0)
      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET
        answer = EXCLUDED.answer,
        is_correct = false,
        points_earned = 0;

      v_saved_count := v_saved_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('saved', v_saved_count);
END;
$$;

REVOKE ALL ON FUNCTION public.save_attempt_answers_draft(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_attempt_answers_draft(UUID, JSONB) TO authenticated;

-- -----------------------------------------------------------------------------
-- 9. Hardened submit_exam_attempt_secure
--    - Rate limited (5 attempts / 60s per user)
--    - FOR UPDATE row lock on exam_attempts
--    - Primary DB uniqueness constraint on exam_submissions (attempt_id)
--    - Server-authoritative starts_at / ends_at / time_limit_minutes validation
--    - Grades ALL exam questions (prevents cherry-picking subset of questions)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_exam_attempt_secure(
  p_attempt_id UUID,
  p_answers JSONB -- Array of {"question_id": "...", "answer": "..."}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_attempt public.exam_attempts%ROWTYPE;
  v_exam public.exams%ROWTYPE;
  v_eq RECORD;
  v_matched_item JSONB;
  v_target_q_id UUID;
  v_ans TEXT;
  v_correct_ans TEXT;
  v_q_type TEXT;
  v_points INT;
  v_earned INT;
  v_is_correct BOOLEAN;
  v_total_points INT := 0;
  v_earned_points INT := 0;
  v_final_score INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Minimal application-level rate limit against submission spam
  PERFORM public.check_rpc_rate_limit('submit_exam', 5, 60);

  -- Concurrency guard: lock this attempt row for the duration of the transaction
  SELECT * INTO v_attempt
  FROM public.exam_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'attempt_not_found';
  END IF;

  IF v_attempt.user_id != v_uid THEN
    RAISE EXCEPTION 'unauthorized_attempt_owner';
  END IF;

  IF v_attempt.status != 'in_progress' THEN
    RAISE EXCEPTION 'attempt_already_submitted';
  END IF;

  SELECT * INTO v_exam FROM public.exams WHERE id = v_attempt.exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam_not_found';
  END IF;

  -- Server-authoritative exam window & elapsed time check (120s grace for auto-submit latency)
  IF v_exam.type = 'exam' THEN
    IF v_exam.starts_at IS NOT NULL AND now() < v_exam.starts_at THEN
      RAISE EXCEPTION 'exam_not_started';
    END IF;
    IF v_exam.ends_at IS NOT NULL AND now() > v_exam.ends_at + interval '120 seconds' THEN
      RAISE EXCEPTION 'exam_submission_window_closed';
    END IF;
    IF v_exam.time_limit_minutes IS NOT NULL
       AND v_exam.time_limit_minutes > 0
       AND now() > v_attempt.started_at + make_interval(mins => v_exam.time_limit_minutes) + interval '120 seconds' THEN
      RAISE EXCEPTION 'exam_time_limit_exceeded';
    END IF;
  END IF;

  -- Grade EVERY authoritative question in the exam (unanswered = 0 points)
  FOR v_eq IN
    SELECT
      eq.question_id,
      COALESCE(eq.points, 1) AS points,
      q.type AS base_type,
      q.correct_answer AS base_correct_answer,
      q.variant_group_id
    FROM public.exam_questions eq
    JOIN public.questions q ON q.id = eq.question_id
    WHERE eq.exam_id = v_attempt.exam_id
    ORDER BY eq.order_index ASC
  LOOP
    v_points := v_eq.points;
    v_total_points := v_total_points + v_points;
    v_target_q_id := v_eq.question_id;
    v_q_type := v_eq.base_type;
    v_correct_ans := v_eq.base_correct_answer;
    v_ans := '';

    -- Find submitted answer matching base question_id OR a valid variant in the same group
    SELECT item INTO v_matched_item
    FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) AS item
    WHERE (item->>'question_id')::UUID = v_eq.question_id
       OR (
         v_eq.variant_group_id IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM public.questions qv
           WHERE qv.id = (item->>'question_id')::UUID
             AND qv.variant_group_id = v_eq.variant_group_id
         )
       )
    LIMIT 1;

    IF v_matched_item IS NOT NULL THEN
      v_target_q_id := (v_matched_item->>'question_id')::UUID;
      v_ans := TRIM(COALESCE(v_matched_item->>'answer', ''));
      IF v_target_q_id != v_eq.question_id THEN
        SELECT type, correct_answer INTO v_q_type, v_correct_ans
        FROM public.questions
        WHERE id = v_target_q_id;
      END IF;
    END IF;

    v_is_correct := public.answers_match_server(v_q_type, v_ans, v_correct_ans);
    v_earned := CASE WHEN v_is_correct THEN v_points ELSE 0 END;
    v_earned_points := v_earned_points + v_earned;

    INSERT INTO public.answers (attempt_id, question_id, answer, is_correct, points_earned)
    VALUES (p_attempt_id, v_target_q_id, v_ans, v_is_correct, v_earned)
    ON CONFLICT (attempt_id, question_id)
    DO UPDATE SET
      answer = EXCLUDED.answer,
      is_correct = EXCLUDED.is_correct,
      points_earned = EXCLUDED.points_earned;
  END LOOP;

  IF v_total_points > 0 THEN
    v_final_score := ROUND((v_earned_points::NUMERIC / v_total_points::NUMERIC) * 100);
  END IF;

  -- Primary DB uniqueness defense (exam_submissions_attempt_unique rejects any duplicate accepted row)
  INSERT INTO public.exam_submissions (
    exam_attempt_id, user_id, exam_id, accepted, score, earned_points, total_points, submitted_at
  )
  VALUES (
    p_attempt_id, v_uid, v_attempt.exam_id, true, v_final_score, v_earned_points, v_total_points, now()
  );

  -- Transition attempt status atomically
  UPDATE public.exam_attempts
  SET
    score = v_final_score,
    total_points = v_total_points,
    status = 'completed',
    completed_at = now()
  WHERE id = p_attempt_id
    AND status = 'in_progress';

  RETURN jsonb_build_object(
    'score', v_final_score,
    'total_points', v_total_points,
    'earned_points', v_earned_points,
    'status', 'completed'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_exam_attempt_secure(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_exam_attempt_secure(UUID, JSONB) TO authenticated;

-- -----------------------------------------------------------------------------
-- 10. Authorized Post-Submission Review RPC (Results Page)
--     Reveals correct_answer / explanation ONLY after attempt is completed (or to staff)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_attempt_review_safe(p_attempt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT := public.get_current_user_role();
  v_attempt RECORD;
  v_answers JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT
    a.*,
    jsonb_build_object(
      'id', e.id,
      'title', e.title,
      'passing_score', e.passing_score,
      'max_attempts', COALESCE(e.max_attempts, 3),
      'type', e.type
    ) AS exam_json
  INTO v_attempt
  FROM public.exam_attempts a
  JOIN public.exams e ON e.id = a.exam_id
  WHERE a.id = p_attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'attempt_not_found';
  END IF;

  IF v_role NOT IN ('teacher', 'admin') THEN
    IF v_attempt.user_id != v_uid THEN
      RAISE EXCEPTION 'unauthorized_attempt_owner';
    END IF;
    IF v_attempt.status != 'completed' THEN
      RAISE EXCEPTION 'attempt_not_completed';
    END IF;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', ans.id,
        'attempt_id', ans.attempt_id,
        'question_id', ans.question_id,
        'answer', ans.answer,
        'is_correct', ans.is_correct,
        'points_earned', ans.points_earned,
        'question', to_jsonb(q.*)
      )
      ORDER BY COALESCE(eq.order_index, 9999) ASC, ans.id ASC
    ),
    '[]'::jsonb
  ) INTO v_answers
  FROM public.answers ans
  JOIN public.questions q ON q.id = ans.question_id
  LEFT JOIN public.exam_questions eq
    ON eq.exam_id = v_attempt.exam_id AND eq.question_id = ans.question_id
  WHERE ans.attempt_id = p_attempt_id;

  RETURN jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', v_attempt.id,
      'user_id', v_attempt.user_id,
      'exam_id', v_attempt.exam_id,
      'started_at', v_attempt.started_at,
      'completed_at', v_attempt.completed_at,
      'score', v_attempt.score,
      'total_points', v_attempt.total_points,
      'status', v_attempt.status,
      'exam', v_attempt.exam_json
    ),
    'answers', v_answers
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_attempt_review_safe(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_attempt_review_safe(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 11. Safe Student RPCs for Practice Sheets, Weak Points & Bookmarks
--     (Keeps all existing student pages working with questions RLS locked!)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_practice_questions_safe(p_exam_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_exam public.exams%ROWTYPE;
  v_questions JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'practice_not_found';
  END IF;

  -- Strictly refuse live exams! Only published practice sheets allowed here.
  IF v_exam.type != 'practice' THEN
    RAISE EXCEPTION 'not_a_practice_sheet';
  END IF;

  IF NOT v_exam.is_published AND public.get_current_user_role() NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'practice_not_published';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', eq.id,
        'exam_id', eq.exam_id,
        'question_id', eq.question_id,
        'order_index', eq.order_index,
        'points', eq.points,
        'question', to_jsonb(q.*)
      )
      ORDER BY eq.order_index ASC
    ),
    '[]'::jsonb
  ) INTO v_questions
  FROM public.exam_questions eq
  JOIN public.questions q ON q.id = eq.question_id
  WHERE eq.exam_id = p_exam_id;

  RETURN v_questions;
END;
$$;

REVOKE ALL ON FUNCTION public.get_practice_questions_safe(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_practice_questions_safe(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_practice_attempt(p_exam_id UUID)
RETURNS public.exam_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_exam public.exams%ROWTYPE;
  v_attempt public.exam_attempts;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND OR v_exam.type != 'practice' THEN
    RAISE EXCEPTION 'not_a_practice_sheet';
  END IF;

  INSERT INTO public.exam_attempts (exam_id, user_id, started_at, status)
  VALUES (p_exam_id, v_uid, now(), 'in_progress')
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;

REVOKE ALL ON FUNCTION public.start_practice_attempt(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_practice_attempt(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_practice_answer(
  p_attempt_id UUID,
  p_question_id UUID,
  p_answer TEXT,
  p_is_correct BOOLEAN DEFAULT false,
  p_points_earned INT DEFAULT 0
)
RETURNS public.answers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.answers;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Must belong to caller, be in_progress, AND belong to a practice sheet (NEVER an exam)
  IF NOT EXISTS (
    SELECT 1
    FROM public.exam_attempts a
    JOIN public.exams e ON e.id = a.exam_id
    WHERE a.id = p_attempt_id
      AND a.user_id = v_uid
      AND a.status = 'in_progress'
      AND e.type = 'practice'
  ) THEN
    RAISE EXCEPTION 'unauthorized_or_not_practice';
  END IF;

  INSERT INTO public.answers (attempt_id, question_id, answer, is_correct, points_earned)
  VALUES (p_attempt_id, p_question_id, COALESCE(p_answer, ''), COALESCE(p_is_correct, false), COALESCE(p_points_earned, 0))
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET
    answer = EXCLUDED.answer,
    is_correct = EXCLUDED.is_correct,
    points_earned = EXCLUDED.points_earned
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_practice_answer(UUID, UUID, TEXT, BOOLEAN, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_practice_answer(UUID, UUID, TEXT, BOOLEAN, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.finish_practice_attempt(
  p_attempt_id UUID,
  p_score INT,
  p_total_points INT
)
RETURNS public.exam_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.exam_attempts;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE public.exam_attempts a
  SET
    completed_at = now(),
    score = LEAST(GREATEST(p_score, 0), 100),
    total_points = GREATEST(p_total_points, 0),
    status = 'completed'
  FROM public.exams e
  WHERE a.id = p_attempt_id
    AND a.exam_id = e.id
    AND a.user_id = v_uid
    AND e.type = 'practice'
  RETURNING a.* INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unauthorized_or_not_practice';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.finish_practice_attempt(UUID, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_practice_attempt(UUID, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_student_weak_points()
RETURNS TABLE (
  subject TEXT,
  topic TEXT,
  total BIGINT,
  correct BIGINT,
  accuracy INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    q.subject,
    q.topic,
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE ans.is_correct)::BIGINT AS correct,
    ROUND((COUNT(*) FILTER (WHERE ans.is_correct)::NUMERIC / NULLIF(COUNT(*), 0)) * 100)::INT AS accuracy
  FROM public.exam_attempts att
  JOIN public.answers ans ON ans.attempt_id = att.id
  JOIN public.questions q ON q.id = ans.question_id
  WHERE att.user_id = auth.uid()
    AND att.status = 'completed'
  GROUP BY q.subject, q.topic
  ORDER BY accuracy ASC, total DESC;
$$;

REVOKE ALL ON FUNCTION public.get_student_weak_points() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_weak_points() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_student_bookmarks()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Only expose bookmarked question details if from a completed attempt OR published practice sheet
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'created_at', bm.created_at,
        'question', to_jsonb(q.*)
      )
      ORDER BY bm.created_at DESC
    ),
    '[]'::jsonb
  )
  FROM public.question_bookmarks bm
  JOIN public.questions q ON q.id = bm.question_id
  WHERE bm.user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.answers ans
        JOIN public.exam_attempts att ON att.id = ans.attempt_id
        WHERE att.user_id = auth.uid()
          AND att.status = 'completed'
          AND ans.question_id = bm.question_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.exam_questions eq
        JOIN public.exams e ON e.id = eq.exam_id
        WHERE eq.question_id = bm.question_id
          AND e.type = 'practice'
          AND e.is_published = true
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_student_bookmarks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_student_bookmarks() TO authenticated;
