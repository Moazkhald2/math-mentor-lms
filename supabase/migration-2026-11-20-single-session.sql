-- =============================================================================
-- Migration: Step 4 — Server-Enforced Single Active Session with Explicit
--            Device-Switch Recovery & Audit Trail
-- Date: 2026-11-20
-- Idempotent — safe to run multiple times.
-- Matching rollback: supabase/ROLLBACK-2026-11-20-single-session.sql
-- Matching test:     supabase/TEST-2026-11-20-single-session.sql
-- =============================================================================

-- 1. Add active session tracking columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_session_token TEXT,
  ADD COLUMN IF NOT EXISTS active_session_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active_device_label TEXT;

-- Ensure activity_logs exists for device-switch audit entries
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper to read active_session_token without RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_session_token()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT active_session_token FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Prevent students from directly spoofing active_session_token via profile UPDATE
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_current_user_role()
    AND active_session_token IS NOT DISTINCT FROM public.get_current_session_token()
  );

-- -----------------------------------------------------------------------------
-- 2. claim_active_session: Forgiving Single-Session Claim / Explicit Switch
--    - If no prior active session, same token, or prior session > 2h idle -> claims immediately
--    - If another active device exists & p_force = false -> returns 'conflict' (no lockout!)
--    - If p_force = true -> atomically switches to this device & writes audit entry
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_active_session(
  p_session_token TEXT,
  p_device_label TEXT DEFAULT 'Browser',
  p_force BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_current_token TEXT;
  v_updated_at TIMESTAMPTZ;
  v_other_device TEXT;
  v_clean_token TEXT := TRIM(COALESCE(p_session_token, ''));
  v_clean_label TEXT := LEFT(TRIM(COALESCE(p_device_label, 'Browser')), 80);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF LENGTH(v_clean_token) < 16 THEN
    RAISE EXCEPTION 'invalid_session_token';
  END IF;

  SELECT active_session_token, active_session_updated_at, active_device_label
  INTO v_current_token, v_updated_at, v_other_device
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  -- Already own the active session -> refresh heartbeat
  IF v_current_token IS NOT NULL AND v_current_token = v_clean_token THEN
    UPDATE public.profiles
    SET active_session_updated_at = now(),
        active_device_label = v_clean_label
    WHERE id = v_uid;

    RETURN jsonb_build_object('status', 'claimed', 'token', v_clean_token);
  END IF;

  -- Another device was active within the last 2 hours and caller has not confirmed switch
  IF v_current_token IS NOT NULL
     AND v_updated_at IS NOT NULL
     AND v_updated_at > now() - interval '2 hours'
     AND NOT COALESCE(p_force, false) THEN
    RETURN jsonb_build_object(
      'status', 'conflict',
      'other_device', COALESCE(v_other_device, 'Another device'),
      'last_seen', v_updated_at
    );
  END IF;

  -- Claim or explicitly switch active session
  UPDATE public.profiles
  SET active_session_token = v_clean_token,
      active_session_updated_at = now(),
      active_device_label = v_clean_label
  WHERE id = v_uid;

  -- Audit explicit device switch when displacing an active session
  IF v_current_token IS NOT NULL AND v_current_token != v_clean_token THEN
    INSERT INTO public.activity_logs (user_id, action, details)
    VALUES (
      v_uid,
      'device_switch',
      jsonb_build_object(
        'previous_device', COALESCE(v_other_device, 'Unknown'),
        'new_device', v_clean_label,
        'forced', COALESCE(p_force, false)
      )
    );
    RETURN jsonb_build_object('status', 'switched', 'token', v_clean_token);
  END IF;

  RETURN jsonb_build_object('status', 'claimed', 'token', v_clean_token);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_active_session(TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_active_session(TEXT, TEXT, BOOLEAN) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. verify_active_session: Lightweight Server Session Check
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_active_session(p_session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_current_token TEXT;
  v_updated_at TIMESTAMPTZ;
  v_other_device TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT active_session_token, active_session_updated_at, active_device_label
  INTO v_current_token, v_updated_at, v_other_device
  FROM public.profiles
  WHERE id = v_uid;

  IF v_current_token IS NULL OR v_current_token = TRIM(COALESCE(p_session_token, '')) THEN
    RETURN jsonb_build_object('valid', true);
  END IF;

  RETURN jsonb_build_object(
    'valid', false,
    'other_device', COALESCE(v_other_device, 'Another device'),
    'last_seen', v_updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_active_session(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_active_session(TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. Internal Helper: Enforce Active Session Inside Live Exam RPCs
--    If the user has an active_session_token registered on their profile,
--    any live-exam RPC call with a missing or mismatched token is rejected.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_active_session_for_exam(p_session_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_current_token TEXT;
  v_clean TEXT := TRIM(COALESCE(p_session_token, ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT active_session_token INTO v_current_token
  FROM public.profiles
  WHERE id = v_uid;

  -- If an active session is claimed, enforce strict server match
  IF v_current_token IS NOT NULL AND (v_clean = '' OR v_current_token != v_clean) THEN
    RAISE EXCEPTION 'session_conflict_other_device';
  END IF;

  -- If no session claimed yet and caller sent a valid token, claim it automatically
  IF v_current_token IS NULL AND LENGTH(v_clean) >= 16 THEN
    UPDATE public.profiles
    SET active_session_token = v_clean,
        active_session_updated_at = now()
    WHERE id = v_uid;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_active_session_for_exam(TEXT) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Upgrade Live-Exam RPCs to Enforce Active Session Server-Side
--    (Default NULL preserves compatibility with Step 3 callers when no token is set)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_exam_questions_safe(UUID, UUID);
CREATE OR REPLACE FUNCTION public.get_exam_questions_safe(
  p_exam_id UUID,
  p_attempt_id UUID,
  p_session_token TEXT DEFAULT NULL
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
  v_questions JSONB;
  v_variants JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Server-enforced single active session check
  PERFORM public.assert_active_session_for_exam(p_session_token);

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

REVOKE ALL ON FUNCTION public.get_exam_questions_safe(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_exam_questions_safe(UUID, UUID, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.save_attempt_answers_draft(UUID, JSONB);
CREATE OR REPLACE FUNCTION public.save_attempt_answers_draft(
  p_attempt_id UUID,
  p_answers JSONB,
  p_session_token TEXT DEFAULT NULL
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

  PERFORM public.assert_active_session_for_exam(p_session_token);

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

REVOKE ALL ON FUNCTION public.save_attempt_answers_draft(UUID, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_attempt_answers_draft(UUID, JSONB, TEXT) TO authenticated;

DROP FUNCTION IF EXISTS public.submit_exam_attempt_secure(UUID, JSONB);
CREATE OR REPLACE FUNCTION public.submit_exam_attempt_secure(
  p_attempt_id UUID,
  p_answers JSONB,
  p_session_token TEXT DEFAULT NULL
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

  PERFORM public.assert_active_session_for_exam(p_session_token);
  PERFORM public.check_rpc_rate_limit('submit_exam', 5, 60);

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

  INSERT INTO public.exam_submissions (
    exam_attempt_id, user_id, exam_id, accepted, score, earned_points, total_points, submitted_at
  )
  VALUES (
    p_attempt_id, v_uid, v_attempt.exam_id, true, v_final_score, v_earned_points, v_total_points, now()
  );

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

REVOKE ALL ON FUNCTION public.submit_exam_attempt_secure(UUID, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_exam_attempt_secure(UUID, JSONB, TEXT) TO authenticated;
