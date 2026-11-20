-- =============================================================================
-- Step 4 — Server-Enforced Single Active Session & Device-Switch Test Suite
-- Run in Supabase SQL Editor AFTER migration-2026-11-20-single-session.sql.
-- Wrapped in BEGIN ... ROLLBACK so ZERO test data is persisted.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_student_id UUID := gen_random_uuid();
  v_teacher_id UUID := gen_random_uuid();
  v_exam_id UUID := gen_random_uuid();
  v_q_id UUID := gen_random_uuid();
  v_attempt_id UUID;
  v_token_phone TEXT := 'phone-token-1234567890abcdef';
  v_token_laptop TEXT := 'laptop-token-abcdef1234567890';
  v_res JSONB;
  v_failed BOOLEAN;
  v_audit_count INT;
BEGIN
  INSERT INTO auth.users (id, instance_id, email, raw_user_meta_data, aud, role, email_confirmed_at, created_at, updated_at)
  VALUES
    (v_student_id, '00000000-0000-0000-0000-000000000000', 'sess_student@test.local', '{"full_name":"Session Student","grade":10}', 'authenticated', 'authenticated', now(), now(), now()),
    (v_teacher_id, '00000000-0000-0000-0000-000000000000', 'sess_teacher@test.local', '{"full_name":"Session Teacher"}', 'authenticated', 'authenticated', now(), now(), now());

  INSERT INTO public.profiles (id, email, full_name, role, grade)
  VALUES
    (v_student_id, 'sess_student@test.local', 'Session Student', 'student', 10),
    (v_teacher_id, 'sess_teacher@test.local', 'Session Teacher', 'teacher', NULL)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, grade = EXCLUDED.grade;

  INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, created_by)
  VALUES (v_q_id, 'short_answer', 'Algebra', 'Equations', 1, '2 + 2 = ?', '[]'::jsonb, '4', 'Equals 4', v_teacher_id);

  INSERT INTO public.exams (id, title, type, grade, is_published, time_limit_minutes, passing_score, max_attempts, created_by)
  VALUES (v_exam_id, 'Session Lock Test Exam', 'exam', 10, true, 30, 60, 3, v_teacher_id);

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points)
  VALUES (v_exam_id, v_q_id, 0, 10);

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student_id::text, 'role', 'authenticated')::text, true);

  -- 1. Phone claims active session
  v_res := public.claim_active_session(v_token_phone, 'Mobile · Chrome', false);
  IF v_res->>'status' != 'claimed' THEN
    RAISE EXCEPTION 'FAIL [1]: expected phone claim to return claimed, got %', v_res;
  END IF;

  -- 1b. Normal profile edit (full_name) succeeds with zero RLS recursion, while spoofing token fails
  UPDATE public.profiles SET full_name = 'Session Student Updated' WHERE id = v_student_id;
  v_failed := false;
  BEGIN
    UPDATE public.profiles SET active_session_token = 'spoofed-token-1234567890' WHERE id = v_student_id;
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL [1b]: student was able to spoof active_session_token directly!';
  END IF;

  SELECT id INTO v_attempt_id FROM public.start_exam_attempt(v_exam_id, v_student_id);

  -- 2. Phone fetches exam questions cleanly
  PERFORM public.get_exam_questions_safe(v_exam_id, v_attempt_id, v_token_phone);

  -- 3. Laptop tries to claim without force -> forgiving conflict returned (no hard lockout)
  v_res := public.claim_active_session(v_token_laptop, 'Desktop · Edge', false);
  IF v_res->>'status' != 'conflict' OR v_res->>'other_device' != 'Mobile · Chrome' THEN
    RAISE EXCEPTION 'FAIL [3]: expected conflict with Mobile · Chrome, got %', v_res;
  END IF;

  -- 4. Laptop tries to call get_exam_questions_safe directly without switching -> server MUST reject!
  v_failed := false;
  BEGIN
    PERFORM public.get_exam_questions_safe(v_exam_id, v_attempt_id, v_token_laptop);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%session_conflict_other_device%' THEN
      v_failed := true;
    END IF;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL [4]: server did NOT reject unswitched second device on get_exam_questions_safe!';
  END IF;

  -- 5. Student explicitly chooses "Sign out other device & continue here" (p_force = true)
  v_res := public.claim_active_session(v_token_laptop, 'Desktop · Edge', true);
  IF v_res->>'status' != 'switched' THEN
    RAISE EXCEPTION 'FAIL [5]: expected switched, got %', v_res;
  END IF;

  -- 6. Audit entry recorded in activity_logs
  SELECT COUNT(*) INTO v_audit_count
  FROM public.activity_logs
  WHERE user_id = v_student_id AND action = 'device_switch';
  IF v_audit_count != 1 THEN
    RAISE EXCEPTION 'FAIL [6]: expected 1 device_switch audit log, got %', v_audit_count;
  END IF;

  -- 7. Laptop can now fetch & submit; displaced phone token is now rejected by server!
  v_failed := false;
  BEGIN
    PERFORM public.submit_exam_attempt_secure(v_attempt_id, '[]'::jsonb, v_token_phone);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%session_conflict_other_device%' THEN
      v_failed := true;
    END IF;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL [7]: displaced phone token was NOT rejected on submit!';
  END IF;

  v_res := public.submit_exam_attempt_secure(
    v_attempt_id,
    jsonb_build_array(jsonb_build_object('question_id', v_q_id, 'answer', '4')),
    v_token_laptop
  );
  IF (v_res->>'score')::INT != 100 THEN
    RAISE EXCEPTION 'FAIL [8]: expected laptop submission score 100, got %', v_res;
  END IF;

  RAISE NOTICE 'ALL STEP 4 SINGLE-SESSION & DEVICE-SWITCH ASSERTIONS PASSED!';
END;
$$;

ROLLBACK;
