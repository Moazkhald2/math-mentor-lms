-- =============================================================================
-- Step 5 — Portable Maintenance RPC Verification Suite
-- Run in Supabase SQL Editor AFTER migration-2026-11-20-portable-maintenance.sql.
-- Wrapped in BEGIN ... ROLLBACK so ZERO test data is persisted.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_student_id UUID := gen_random_uuid();
  v_admin_id UUID := gen_random_uuid();
  v_res JSONB;
  v_failed BOOLEAN;
  v_remaining INT;
BEGIN
  INSERT INTO auth.users (id, instance_id, email, raw_user_meta_data, aud, role, email_confirmed_at, created_at, updated_at)
  VALUES
    (v_student_id, '00000000-0000-0000-0000-000000000000', 'maint_student@test.local', '{"full_name":"Maint Student","grade":10}', 'authenticated', 'authenticated', now(), now(), now()),
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'maint_admin@test.local', '{"full_name":"Maint Admin"}', 'authenticated', 'authenticated', now(), now(), now());

  INSERT INTO public.profiles (id, email, full_name, role, grade)
  VALUES
    (v_student_id, 'maint_student@test.local', 'Maint Student', 'student', 10),
    (v_admin_id, 'maint_admin@test.local', 'Maint Admin', 'admin', NULL)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, grade = EXCLUDED.grade;

  -- Seed 1 old log (120 days ago) and 1 recent log (5 days ago)
  INSERT INTO public.activity_logs (user_id, action, details, created_at)
  VALUES
    (v_student_id, 'exam_started', '{}'::jsonb, now() - interval '120 days'),
    (v_student_id, 'exam_submitted', '{}'::jsonb, now() - interval '5 days');

  -- 1. Student MUST NOT be able to run maintenance
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_student_id::text, 'role', 'authenticated')::text, true);

  v_failed := false;
  BEGIN
    PERFORM public.prune_old_activity_logs(90);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%unauthorized_admin_only%' THEN
      v_failed := true;
    END IF;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL [1]: student was allowed to run prune_old_activity_logs!';
  END IF;

  -- 2. Admin runs maintenance -> deletes only the 120-day-old row, preserves 5-day-old row
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);

  v_res := public.prune_old_activity_logs(90);
  IF (v_res->>'retention_days')::INT != 90 OR (v_res->>'deleted_activity_logs')::INT < 1 THEN
    RAISE EXCEPTION 'FAIL [2]: unexpected prune output: %', v_res;
  END IF;

  SELECT COUNT(*) INTO v_remaining FROM public.activity_logs WHERE user_id = v_student_id;
  IF v_remaining != 1 THEN
    RAISE EXCEPTION 'FAIL [3]: expected 1 recent row preserved, got %', v_remaining;
  END IF;

  -- 3. Idempotent second run deletes 0 of our test rows cleanly
  v_res := public.prune_old_activity_logs(NULL);
  IF (v_res->>'retention_days')::INT != 90 THEN
    RAISE EXCEPTION 'FAIL [4]: persisted retention_days did not stay 90: %', v_res;
  END IF;

  RAISE NOTICE 'ALL STEP 5 PORTABLE MAINTENANCE ASSERTIONS PASSED!';
END;
$$;

ROLLBACK;
