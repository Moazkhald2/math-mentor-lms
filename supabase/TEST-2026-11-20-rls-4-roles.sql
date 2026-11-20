-- =============================================================================
-- Step 3 — 4-Role RLS & Exam Integrity Verification Suite
-- Paste & run in Supabase SQL Editor AFTER running migration-2026-11-20-answer-key-lock.sql.
-- Wrapped in BEGIN ... ROLLBACK so ZERO test data is persisted!
-- If ALL assertions pass, you will see NOTICE lines ending with:
--   "ALL 4-ROLE RLS & EXAM INTEGRITY ASSERTIONS PASSED!"
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_student_id UUID := gen_random_uuid();
  v_other_student_id UUID := gen_random_uuid();
  v_teacher_id UUID := gen_random_uuid();
  v_admin_id UUID := gen_random_uuid();
  v_exam_id UUID := gen_random_uuid();
  v_q_id UUID := gen_random_uuid();
  v_attempt_id UUID;
  v_count INT;
  v_payload JSONB;
  v_submit_res JSONB;
  v_review_res JSONB;
  v_failed BOOLEAN;
BEGIN
  -- ---------------------------------------------------------------------------
  -- Seed temporary test fixtures (rolled back at end of transaction)
  -- ---------------------------------------------------------------------------
  INSERT INTO auth.users (id, instance_id, email, raw_user_meta_data, aud, role, email_confirmed_at, created_at, updated_at)
  VALUES
    (v_student_id, '00000000-0000-0000-0000-000000000000', 'rls_student1@test.local', '{"full_name":"RLS Student 1","grade":10}', 'authenticated', 'authenticated', now(), now(), now()),
    (v_other_student_id, '00000000-0000-0000-0000-000000000000', 'rls_student2@test.local', '{"full_name":"RLS Student 2","grade":10}', 'authenticated', 'authenticated', now(), now(), now()),
    (v_teacher_id, '00000000-0000-0000-0000-000000000000', 'rls_teacher@test.local', '{"full_name":"RLS Teacher"}', 'authenticated', 'authenticated', now(), now(), now()),
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'rls_admin@test.local', '{"full_name":"RLS Admin"}', 'authenticated', 'authenticated', now(), now(), now());

  INSERT INTO public.profiles (id, email, full_name, role, grade)
  VALUES
    (v_student_id, 'rls_student1@test.local', 'RLS Student 1', 'student', 10),
    (v_other_student_id, 'rls_student2@test.local', 'RLS Student 2', 'student', 10),
    (v_teacher_id, 'rls_teacher@test.local', 'RLS Teacher', 'teacher', NULL),
    (v_admin_id, 'rls_admin@test.local', 'RLS Admin', 'admin', NULL)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, grade = EXCLUDED.grade;

  INSERT INTO public.questions (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, common_mistakes, created_by)
  VALUES (
    v_q_id, 'multiple_choice', 'Algebra', 'Equations', 1,
    'Solve x + 2 = 5', '["1", "2", "3", "4"]'::jsonb, '2',
    'Subtract 2 from both sides: x = 3.',
    '[{"mistake":"7","why":"Added instead of subtracted","correct":"3"}]'::jsonb,
    v_teacher_id
  );

  INSERT INTO public.exams (id, title, type, grade, is_published, time_limit_minutes, passing_score, max_attempts, created_by)
  VALUES (v_exam_id, 'RLS Security Test Exam', 'exam', 10, true, 30, 60, 3, v_teacher_id);

  INSERT INTO public.exam_questions (exam_id, question_id, order_index, points)
  VALUES (v_exam_id, v_q_id, 0, 10);

  -- ===========================================================================
  -- ROLE 1: ANON (Unauthenticated visitor)
  -- ===========================================================================
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM set_config('request.jwt.claims', '{}', true);

  SELECT COUNT(*) INTO v_count FROM public.questions;
  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL [anon]: expected 0 rows from public.questions, got %', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.exam_questions;
  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL [anon]: expected 0 rows from public.exam_questions, got %', v_count;
  END IF;

  RAISE NOTICE 'PASS [1/4]: anon cannot read questions or exam_questions';

  -- ===========================================================================
  -- ROLE 2: STUDENT
  -- ===========================================================================
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student_id::text, 'role', 'authenticated')::text, true);

  -- 2a. Direct SELECT on questions MUST return 0 rows
  SELECT COUNT(*) INTO v_count FROM public.questions;
  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL [student]: direct SELECT on public.questions leaked % rows!', v_count;
  END IF;

  -- 2b. Role self-escalation MUST be blocked
  v_failed := false;
  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = v_student_id;
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL [student]: role self-escalation to admin was NOT blocked!';
  END IF;

  -- 2c. Calling get_exam_questions_safe WITHOUT an active attempt MUST fail
  v_failed := false;
  BEGIN
    PERFORM public.get_exam_questions_safe(v_exam_id, gen_random_uuid());
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL [student]: get_exam_questions_safe allowed call without active attempt!';
  END IF;

  -- 2d. Calling get_practice_questions_safe on a live EXAM MUST fail
  v_failed := false;
  BEGIN
    PERFORM public.get_practice_questions_safe(v_exam_id);
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL [student]: get_practice_questions_safe leaked live exam!';
  END IF;

  -- 2e. Start authorized attempt & fetch safe exam questions
  SELECT id INTO v_attempt_id FROM public.start_exam_attempt(v_exam_id, v_student_id);
  v_payload := public.get_exam_questions_safe(v_exam_id, v_attempt_id);

  IF v_payload::text LIKE '%correct_answer%' OR v_payload::text LIKE '%explanation%' OR v_payload::text LIKE '%common_mistakes%' THEN
    RAISE EXCEPTION 'FAIL [student]: get_exam_questions_safe payload leaked sensitive key fields!';
  END IF;

  -- 2f. Post-submission review MUST fail while attempt is still in_progress
  v_failed := false;
  BEGIN
    PERFORM public.get_attempt_review_safe(v_attempt_id);
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL [student]: get_attempt_review_safe allowed review before submission!';
  END IF;

  -- 2g. Direct UPDATE on exam_attempts score MUST be blocked (0 rows updated or denied)
  UPDATE public.exam_attempts SET score = 100 WHERE id = v_attempt_id;
  SELECT COUNT(*) INTO v_count FROM public.exam_attempts WHERE id = v_attempt_id AND score = 100;
  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL [student]: direct UPDATE forged exam_attempts.score = 100!';
  END IF;

  -- 2h. Submit securely & verify server score + duplicate-submit rejection
  v_submit_res := public.submit_exam_attempt_secure(
    v_attempt_id,
    jsonb_build_array(jsonb_build_object('question_id', v_q_id, 'answer', '2'))
  );
  IF (v_submit_res->>'score')::INT != 100 THEN
    RAISE EXCEPTION 'FAIL [student]: expected score 100, got %', v_submit_res;
  END IF;

  -- Duplicate submission MUST fail
  v_failed := false;
  BEGIN
    PERFORM public.submit_exam_attempt_secure(
      v_attempt_id,
      jsonb_build_array(jsonb_build_object('question_id', v_q_id, 'answer', '2'))
    );
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL [student]: duplicate submit_exam_attempt_secure was NOT rejected!';
  END IF;

  -- 2i. Post-submission review NOW succeeds for owner and reveals explanation
  v_review_res := public.get_attempt_review_safe(v_attempt_id);
  IF v_review_res::text NOT LIKE '%Subtract 2 from both sides%' THEN
    RAISE EXCEPTION 'FAIL [student]: post-submission review missing explanation!';
  END IF;

  -- 2j. Another student CANNOT read student 1's completed review
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_other_student_id::text, 'role', 'authenticated')::text, true);
  v_failed := false;
  BEGIN
    PERFORM public.get_attempt_review_safe(v_attempt_id);
  EXCEPTION WHEN OTHERS THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL [other_student]: was able to view another student review!';
  END IF;

  RAISE NOTICE 'PASS [2/4]: student isolation, answer-key lock, anti-escalation & duplicate-submit guards passed';

  -- ===========================================================================
  -- ROLE 3: TEACHER
  -- ===========================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_teacher_id::text, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_count FROM public.questions WHERE id = v_q_id;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL [teacher]: teacher cannot read questions!';
  END IF;

  v_review_res := public.get_attempt_review_safe(v_attempt_id);
  IF (v_review_res->'attempt'->>'score')::INT != 100 THEN
    RAISE EXCEPTION 'FAIL [teacher]: teacher cannot inspect student attempt review!';
  END IF;

  RAISE NOTICE 'PASS [3/4]: teacher full question bank & student review access passed';

  -- ===========================================================================
  -- ROLE 4: ADMIN
  -- ===========================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_count FROM public.questions WHERE id = v_q_id;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL [admin]: admin cannot read questions!';
  END IF;

  UPDATE public.profiles SET role = 'teacher' WHERE id = v_other_student_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL [admin]: admin could not update student role!';
  END IF;

  RAISE NOTICE 'PASS [4/4]: admin question bank & role management passed';
  RAISE NOTICE 'ALL 4-ROLE RLS & EXAM INTEGRITY ASSERTIONS PASSED!';
END;
$$;

ROLLBACK;
