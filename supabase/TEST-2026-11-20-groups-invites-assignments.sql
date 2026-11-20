-- =============================================================================
-- Step 7 — Groups, Invite Links & Target Assignments Verification Suite
-- Run in Supabase SQL Editor AFTER migration-2026-11-20-groups-invites-assignments.sql.
-- Wrapped in BEGIN ... ROLLBACK so ZERO test data is persisted.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_admin_id UUID := gen_random_uuid();
  v_stu1_id UUID := gen_random_uuid();
  v_stu2_id UUID := gen_random_uuid();
  v_class public.classes;
  v_exam_id UUID := gen_random_uuid();
  v_res JSONB;
  v_failed BOOLEAN;
  v_count INT;
BEGIN
  INSERT INTO auth.users (id, instance_id, email, raw_user_meta_data, aud, role, email_confirmed_at, created_at, updated_at)
  VALUES
    (v_admin_id, '00000000-0000-0000-0000-000000000000', 'grp_admin@test.local', '{"full_name":"Group Admin"}', 'authenticated', 'authenticated', now(), now(), now()),
    (v_stu1_id, '00000000-0000-0000-0000-000000000000', 'grp_stu1@test.local', '{"full_name":"Student One","grade":7}', 'authenticated', 'authenticated', now(), now(), now()),
    (v_stu2_id, '00000000-0000-0000-0000-000000000000', 'grp_stu2@test.local', '{"full_name":"Student Two","grade":7}', 'authenticated', 'authenticated', now(), now(), now());

  INSERT INTO public.profiles (id, email, full_name, role, grade)
  VALUES
    (v_admin_id, 'grp_admin@test.local', 'Group Admin', 'admin', NULL),
    (v_stu1_id, 'grp_stu1@test.local', 'Student One', 'student', 7),
    (v_stu2_id, 'grp_stu2@test.local', 'Student Two', 'student', 7)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, grade = EXCLUDED.grade;

  -- Create group as admin (invite_enabled MUST default to false!)
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);

  INSERT INTO public.classes (name, grade, schedule_note)
  VALUES ('Sat/Tue 5PM', 8, 'Sat & Tue 5:00 PM')
  RETURNING * INTO v_class;

  IF v_class.invite_enabled != false OR v_class.invite_code IS NULL THEN
    RAISE EXCEPTION 'FAIL [1]: new group must start with invite_enabled=false and auto-generated code, got %', v_class;
  END IF;

  -- Disabled link MUST return valid=false on preview
  v_res := public.preview_group_invite(v_class.invite_code);
  IF (v_res->>'valid')::BOOLEAN != false THEN
    RAISE EXCEPTION 'FAIL [2]: disabled invite link should preview valid=false, got %', v_res;
  END IF;

  -- Admin enables invite link with max_students = 1
  v_class := public.update_group_invite_settings(v_class.id, true, false, NULL, false, 1, false, NULL);

  -- Preview now returns valid=true with spots_left=1
  v_res := public.preview_group_invite(v_class.invite_code);
  IF (v_res->>'valid')::BOOLEAN != true OR (v_res->>'spots_left')::INT != 1 THEN
    RAISE EXCEPTION 'FAIL [3]: enabled invite preview failed: %', v_res;
  END IF;

  -- Student 1 redeems invite -> joins group & profile grade updates to 8
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_stu1_id::text, 'role', 'authenticated')::text, true);
  v_res := public.redeem_group_invite(v_class.invite_code);
  IF (v_res->>'joined')::BOOLEAN != true OR (v_res->>'grade')::INT != 8 THEN
    RAISE EXCEPTION 'FAIL [4]: student 1 redeem failed: %', v_res;
  END IF;

  -- Student 2 tries to redeem full group (max_students=1) -> MUST fail!
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_stu2_id::text, 'role', 'authenticated')::text, true);
  v_failed := false;
  BEGIN
    PERFORM public.redeem_group_invite(v_class.invite_code);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%invite_group_full%' THEN
      v_failed := true;
    END IF;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'FAIL [5]: full group allowed student 2 to join!';
  END IF;

  -- Admin assigns an exam strictly to this Group; Student 1 sees it, Student 2 does NOT
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);
  INSERT INTO public.exams (id, title, type, grade, is_published, created_by)
  VALUES (v_exam_id, 'Group 8 Quiz', 'exam', 8, true, v_admin_id);

  INSERT INTO public.exam_assignments (exam_id, target_type, target_group_id, created_by)
  VALUES (v_exam_id, 'group', v_class.id, v_admin_id);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_stu1_id::text, 'role', 'authenticated')::text, true);
  SELECT COUNT(*) INTO v_count FROM public.exam_assignments WHERE exam_id = v_exam_id;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'FAIL [6]: group member Student 1 did not see group assignment!';
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_stu2_id::text, 'role', 'authenticated')::text, true);
  SELECT COUNT(*) INTO v_count FROM public.exam_assignments WHERE exam_id = v_exam_id;
  IF v_count != 0 THEN
    RAISE EXCEPTION 'FAIL [7]: non-member Student 2 saw another group assignment!';
  END IF;

  RAISE NOTICE 'ALL STEP 7 GROUPS, INVITE LINKS & ASSIGNMENTS ASSERTIONS PASSED!';
END;
$$;

ROLLBACK;
