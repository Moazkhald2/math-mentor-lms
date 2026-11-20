-- =============================================================================
-- Migration: Step 7 — Grades -> Groups + Rate-Limited Invite Links +
--            Targeted Exam/Sheet Assignments (Grade / Group / Single Student)
-- Date: 2026-11-20
-- Note: invite_enabled defaults to FALSE (groups stay locked until owner enables).
-- Safe to run multiple times (idempotent).
-- Matching rollback: supabase/ROLLBACK-2026-11-20-groups-invites-assignments.sql
-- Matching test:     supabase/TEST-2026-11-20-groups-invites-assignments.sql
-- =============================================================================

-- 1. Extend public.classes (Groups within Grades 1–12) with Invite Controls
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS invite_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_students INTEGER CHECK (max_students IS NULL OR max_students > 0),
  ADD COLUMN IF NOT EXISTS schedule_note TEXT NOT NULL DEFAULT '';

-- Backfill unique unguessable invite codes (disabled by default!) for existing rows
UPDATE public.classes
SET invite_code = 'G' || grade::text || '-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 10))
WHERE invite_code IS NULL OR TRIM(invite_code) = '';

CREATE UNIQUE INDEX IF NOT EXISTS classes_invite_code_uidx
  ON public.classes (UPPER(invite_code));

-- Auto-generate an invite code on new class/group insert if omitted (invite_enabled stays false!)
CREATE OR REPLACE FUNCTION public.ensure_class_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invite_code IS NULL OR TRIM(NEW.invite_code) = '' THEN
    NEW.invite_code := 'G' || COALESCE(NEW.grade, 1)::text || '-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 10));
  ELSE
    NEW.invite_code := UPPER(TRIM(NEW.invite_code));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_class_invite_code ON public.classes;
CREATE TRIGGER trg_ensure_class_invite_code
  BEFORE INSERT ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.ensure_class_invite_code();

-- Helper to read current user's grade without RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_grade()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT grade FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Targeted Exam/Sheet Assignments (Entire Grade, Specific Group, or Single Student)
CREATE TABLE IF NOT EXISTS public.exam_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('grade', 'group', 'student')),
  target_grade INTEGER CHECK (target_grade IS NULL OR (target_grade BETWEEN 1 AND 12)),
  target_group_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  target_student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at_override TIMESTAMPTZ,
  ends_at_override TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exam_assignments_target_match_chk CHECK (
    (target_type = 'grade'   AND target_grade IS NOT NULL AND target_group_id IS NULL AND target_student_id IS NULL) OR
    (target_type = 'group'   AND target_group_id IS NOT NULL AND target_grade IS NULL AND target_student_id IS NULL) OR
    (target_type = 'student' AND target_student_id IS NOT NULL AND target_grade IS NULL AND target_group_id IS NULL)
  )
);

ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS exam_assignments_grade_uidx
  ON public.exam_assignments (exam_id, target_grade)
  WHERE target_type = 'grade';

CREATE UNIQUE INDEX IF NOT EXISTS exam_assignments_group_uidx
  ON public.exam_assignments (exam_id, target_group_id)
  WHERE target_type = 'group';

CREATE UNIQUE INDEX IF NOT EXISTS exam_assignments_student_uidx
  ON public.exam_assignments (exam_id, target_student_id)
  WHERE target_type = 'student';

CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam ON public.exam_assignments (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_group ON public.exam_assignments (target_group_id);
CREATE INDEX IF NOT EXISTS idx_exam_assignments_student ON public.exam_assignments (target_student_id);

DROP POLICY IF EXISTS "Staff can manage exam_assignments" ON public.exam_assignments;
CREATE POLICY "Staff can manage exam_assignments"
  ON public.exam_assignments FOR ALL
  USING (public.get_current_user_role() IN ('teacher', 'admin'))
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Students read matching exam_assignments" ON public.exam_assignments;
CREATE POLICY "Students read matching exam_assignments"
  ON public.exam_assignments FOR SELECT
  USING (
    (target_type = 'student' AND target_student_id = auth.uid())
    OR (target_type = 'group' AND target_group_id IN (SELECT public.user_class_ids()))
    OR (target_type = 'grade' AND target_grade = public.get_current_user_grade())
  );

-- 3. Public-Safe Invite Link Preview (Zero PII, Zero Member Details)
CREATE OR REPLACE FUNCTION public.preview_group_invite(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_clean TEXT := UPPER(TRIM(COALESCE(p_code, '')));
  v_class public.classes%ROWTYPE;
  v_member_count INT;
BEGIN
  IF LENGTH(v_clean) < 4 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_or_disabled');
  END IF;

  SELECT * INTO v_class
  FROM public.classes
  WHERE UPPER(invite_code) = v_clean;

  -- Treat missing and disabled identically so attackers cannot enumerate locked codes
  IF NOT FOUND OR NOT v_class.invite_enabled THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_or_disabled');
  END IF;

  IF v_class.invite_expires_at IS NOT NULL AND now() > v_class.invite_expires_at THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM public.class_members
  WHERE class_id = v_class.id;

  IF v_class.max_students IS NOT NULL AND v_member_count >= v_class.max_students THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'group_full',
      'group_name', v_class.name,
      'grade', v_class.grade
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'group_id', v_class.id,
    'group_name', v_class.name,
    'grade', v_class.grade,
    'schedule_note', v_class.schedule_note,
    'spots_left', CASE WHEN v_class.max_students IS NULL THEN NULL ELSE GREATEST(v_class.max_students - v_member_count, 0) END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.preview_group_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_group_invite(TEXT) TO anon, authenticated;

-- 4. Rate-Limited, Capacity-Safe Invite Link Redemption RPC
CREATE OR REPLACE FUNCTION public.redeem_group_invite(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_clean TEXT := UPPER(TRIM(COALESCE(p_code, '')));
  v_class public.classes%ROWTYPE;
  v_member_count INT;
  v_already_member BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Server-side brute-force guard: max 10 invite attempts per 5 minutes per user
  PERFORM public.check_rpc_rate_limit('redeem_invite', 10, 300);

  -- Lock the group row so max_students check is race-safe under concurrent joins
  SELECT * INTO v_class
  FROM public.classes
  WHERE UPPER(invite_code) = v_clean
  FOR UPDATE;

  IF NOT FOUND OR NOT v_class.invite_enabled THEN
    RAISE EXCEPTION 'invite_invalid_or_disabled';
  END IF;

  IF v_class.invite_expires_at IS NOT NULL AND now() > v_class.invite_expires_at THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.class_members
    WHERE class_id = v_class.id AND student_id = v_uid
  ) INTO v_already_member;

  IF NOT v_already_member THEN
    SELECT COUNT(*) INTO v_member_count
    FROM public.class_members
    WHERE class_id = v_class.id;

    IF v_class.max_students IS NOT NULL AND v_member_count >= v_class.max_students THEN
      RAISE EXCEPTION 'invite_group_full';
    END IF;

    INSERT INTO public.class_members (class_id, student_id)
    VALUES (v_class.id, v_uid)
    ON CONFLICT (class_id, student_id) DO NOTHING;
  END IF;

  -- Align student's grade & group label automatically
  UPDATE public.profiles
  SET grade = v_class.grade,
      class_code = v_class.name
  WHERE id = v_uid
    AND role = 'student';

  INSERT INTO public.activity_logs (user_id, action, details)
  VALUES (
    v_uid,
    'group_joined',
    jsonb_build_object('group_id', v_class.id, 'group_name', v_class.name, 'grade', v_class.grade)
  );

  RETURN jsonb_build_object(
    'joined', true,
    'already_member', v_already_member,
    'group_id', v_class.id,
    'group_name', v_class.name,
    'grade', v_class.grade
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_group_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_group_invite(TEXT) TO authenticated;

-- 5. Staff Invite Link Control RPC (Enable/Disable, Rotate Code, Expiry, Capacity)
CREATE OR REPLACE FUNCTION public.update_group_invite_settings(
  p_class_id UUID,
  p_invite_enabled BOOLEAN DEFAULT NULL,
  p_rotate_code BOOLEAN DEFAULT false,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_clear_expiry BOOLEAN DEFAULT false,
  p_max_students INT DEFAULT NULL,
  p_clear_max BOOLEAN DEFAULT false,
  p_schedule_note TEXT DEFAULT NULL
)
RETURNS public.classes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT := public.get_current_user_role();
  v_row public.classes;
BEGIN
  IF v_uid IS NULL OR v_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'unauthorized_staff_only';
  END IF;

  SELECT * INTO v_row FROM public.classes WHERE id = p_class_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'group_not_found';
  END IF;

  IF v_role = 'teacher' AND v_row.teacher_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'unauthorized_not_group_owner';
  END IF;

  UPDATE public.classes
  SET
    invite_enabled = COALESCE(p_invite_enabled, invite_enabled),
    invite_code = CASE
      WHEN COALESCE(p_rotate_code, false)
        THEN 'G' || v_row.grade::text || '-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 10))
      ELSE invite_code
    END,
    invite_expires_at = CASE
      WHEN COALESCE(p_clear_expiry, false) THEN NULL
      WHEN p_expires_at IS NOT NULL THEN p_expires_at
      ELSE invite_expires_at
    END,
    max_students = CASE
      WHEN COALESCE(p_clear_max, false) THEN NULL
      WHEN p_max_students IS NOT NULL THEN GREATEST(p_max_students, 1)
      ELSE max_students
    END,
    schedule_note = COALESCE(p_schedule_note, schedule_note)
  WHERE id = p_class_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_group_invite_settings(UUID, BOOLEAN, BOOLEAN, TIMESTAMPTZ, BOOLEAN, INT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_group_invite_settings(UUID, BOOLEAN, BOOLEAN, TIMESTAMPTZ, BOOLEAN, INT, BOOLEAN, TEXT) TO authenticated;
