-- =============================================================================
-- Migration: Secure Server-Side Grading & Anti-Cheat Score Lock
-- Date: 2026-11-18
-- Description:
-- Prevents students from using HTTP PUT/PATCH to overwrite scores or answers.
-- Grades answers securely on Supabase server via a SECURITY DEFINER RPC.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_exam_attempt_secure(
  p_attempt_id UUID,
  p_answers JSONB -- Array of {"question_id": "...", "answer": "..."}
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
  v_item JSONB;
  v_q_id UUID;
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
  -- 1. Verify attempt ownership & status
  SELECT user_id, status INTO v_user_id, v_status
  FROM public.exam_attempts
  WHERE id = p_attempt_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: attempt belongs to another user';
  END IF;

  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'This exam attempt has already been submitted';
  END IF;

  -- 2. Grade each submitted answer against the authoritative question record
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers)
  LOOP
    v_q_id := (v_item->>'question_id')::UUID;
    v_ans  := TRIM(COALESCE(v_item->>'answer', ''));

    -- Fetch question details & weight
    SELECT q.correct_answer, q.type, COALESCE(eq.points, 1)
    INTO v_correct_ans, v_q_type, v_points
    FROM public.questions q
    JOIN public.exam_questions eq ON eq.question_id = q.id
    WHERE q.id = v_q_id;

    -- If question found, grade it
    IF v_correct_ans IS NOT NULL THEN
      v_total_points := v_total_points + v_points;

      IF v_q_type = 'short_answer' THEN
        v_is_correct := LOWER(v_ans) = LOWER(TRIM(v_correct_ans));
      ELSE
        v_is_correct := v_ans = v_correct_ans;
      END IF;

      v_earned := CASE WHEN v_is_correct THEN v_points ELSE 0 END;
      v_earned_points := v_earned_points + v_earned;

      -- Upsert the graded answer securely
      INSERT INTO public.answers (attempt_id, question_id, answer, is_correct, points_earned)
      VALUES (p_attempt_id, v_q_id, v_ans, v_is_correct, v_earned)
      ON CONFLICT (attempt_id, question_id)
      DO UPDATE SET
        answer = EXCLUDED.answer,
        is_correct = EXCLUDED.is_correct,
        points_earned = EXCLUDED.points_earned;
    END IF;
  END LOOP;

  -- 3. Compute score percentage
  IF v_total_points > 0 THEN
    v_final_score := ROUND((v_earned_points::NUMERIC / v_total_points::NUMERIC) * 100);
  END IF;

  -- 4. Mark attempt completed with the server-verified score
  UPDATE public.exam_attempts
  SET
    score = v_final_score,
    total_points = v_total_points,
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'score', v_final_score,
    'total_points', v_total_points,
    'earned_points', v_earned_points,
    'status', 'completed'
  );
END;
$$;

-- Grant execution to authenticated students
GRANT EXECUTE ON FUNCTION public.submit_exam_attempt_secure(UUID, JSONB) TO authenticated;
