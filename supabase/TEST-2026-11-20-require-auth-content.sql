-- =============================================================================
-- Auth-Only Content Lock Verification Suite
-- Run in Supabase SQL Editor AFTER migration-2026-11-20-require-auth-content.sql.
-- Wrapped in BEGIN ... ROLLBACK so ZERO test data is persisted.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_admin_id UUID := gen_random_uuid();
  v_stu_id UUID := gen_random_uuid();
  v_pub_exam_id UUID := gen_random_uuid();
  v_draft_exam_id UUID := gen_random_uuid();
  v_count INT;
  v_anon_blocked BOOLEAN := false;
BEGIN
  INSERT INTO auth.users (id, instance_id, email, raw_user_meta_data, aud, role, email_confirmed_at, created_at, updated_at)
  VALUES
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authlock_admin@test.local', '{"full_name":"Lock Admin"}', 'authenticated', 'authenticated', now(), now(), now()),
    (v_stu_id, '00000000-0000-0000-0000-000000000000', 'authlock_stu@test.local', '{"full_name":"Lock Student","grade":9}', 'authenticated', 'authenticated', now(), now(), now());

  INSERT INTO public.profiles (id, email, full_name, role, grade)
  VALUES
    (v_admin_id, 'authlock_admin@test.local', 'Lock Admin', 'admin', NULL),
    (v_stu_id, 'authlock_stu@test.local', 'Lock Student', 'student', 9)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, grade = EXCLUDED.grade;

  INSERT INTO public.exams (id, title, type, grade, is_published, created_by)
  VALUES
    (v_pub_exam_id, 'Auth Lock Published Exam', 'exam', 9, true, v_admin_id),
    (v_draft_exam_id, 'Auth Lock Draft Exam', 'exam', 9, false, v_admin_id);

  -- [1] anon MUST be blocked from reading public.exams (permission denied or 0 rows)
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM set_config('request.jwt.claims', '{}', true);
  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.exams WHERE id IN (v_pub_exam_id, v_draft_exam_id);
    IF v_count = 0 THEN
      v_anon_blocked := true;
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    v_anon_blocked := true;
  END;
  IF NOT v_anon_blocked THEN
    RAISE EXCEPTION 'FAIL [1]: anon role was able to read % exam row(s)!', v_count;
  END IF;

  -- [2] authenticated student sees published exam, NEVER draft exam
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_stu_id::text, 'role', 'authenticated')::text, true);

  SELECT COUNT(*) INTO v_count FROM public.exams WHERE id = v_pub_exam_id;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL [2]: authenticated student could not read published exam (got %)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.exams WHERE id = v_draft_exam_id;
  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL [3]: authenticated student saw unpublished draft exam (got %)', v_count;
  END IF;

  -- [4] authenticated admin sees BOTH published and draft exams
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);
  SELECT COUNT(*) INTO v_count FROM public.exams WHERE id IN (v_pub_exam_id, v_draft_exam_id);
  IF v_count != 2 THEN
    RAISE EXCEPTION 'FAIL [4]: admin expected 2 exams, got %', v_count;
  END IF;

  RAISE NOTICE 'ALL 4 AUTH-ONLY CONTENT LOCK TESTS PASSED!';
END $$;

ROLLBACK;
