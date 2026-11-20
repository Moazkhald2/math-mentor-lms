-- =============================================================================
-- Migration: Auth-Only Content Lock (Zero Unauthenticated Access to LMS Data)
-- Date: 2026-11-20
-- Goal: Prevent unauthenticated (anon) visitors from reading ANY LMS content
--       (exams, sheets, questions, attempts, profiles, groups, assignments, etc.)
--       while keeping public group invite previews (preview_group_invite) safe.
-- Safe to run multiple times (idempotent).
-- Matching rollback: supabase/ROLLBACK-2026-11-20-require-auth-content.sql
-- Matching test:     supabase/TEST-2026-11-20-require-auth-content.sql
-- =============================================================================

-- 1. Ensure RLS is enabled on public.exams
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy permissive SELECT policy on public.exams (including "Anyone can read published exams")
DO $$
DECLARE
  v_pol RECORD;
BEGIN
  FOR v_pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exams'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.exams', v_pol.policyname);
  END LOOP;
END $$;

-- 3. Allow ONLY signed-in users to read published exams (or teachers/admins to read all)
CREATE POLICY "Authenticated users can read published exams"
  ON public.exams FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_published
      OR auth.uid() = created_by
      OR public.get_current_user_role() IN ('teacher', 'admin')
    )
  );

-- 4. Ensure staff write policy on public.exams is strictly scoped to authenticated role
DROP POLICY IF EXISTS "Teachers can manage exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers and admins can manage exams" ON public.exams;
CREATE POLICY "Teachers and admins can manage exams"
  ON public.exams FOR ALL
  TO authenticated
  USING (public.get_current_user_role() IN ('teacher', 'admin'))
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

-- 5. Defense-in-depth: revoke direct table privileges from anon on all LMS tables
--    (Public flows use GoTrue Auth endpoints + SECURITY DEFINER preview_group_invite RPC only)
DO $$
DECLARE
  v_tbl TEXT;
  v_tables TEXT[] := ARRAY[
    'public.exams',
    'public.questions',
    'public.exam_questions',
    'public.exam_attempts',
    'public.answers',
    'public.exam_submissions',
    'public.profiles',
    'public.classes',
    'public.class_members',
    'public.exam_assignments',
    'public.activity_logs',
    'public.question_bookmarks',
    'public.question_feedback',
    'public.system_settings',
    'public.rpc_rate_limits'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    IF to_regclass(v_tbl) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE %s FROM anon', v_tbl);
    END IF;
  END LOOP;
END $$;

-- 6. Explicitly preserve safe non-PII invite link preview for signed-out invitees
DO $$
BEGIN
  IF to_regprocedure('public.preview_group_invite(text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.preview_group_invite(TEXT) TO anon, authenticated;
  END IF;
END $$;
