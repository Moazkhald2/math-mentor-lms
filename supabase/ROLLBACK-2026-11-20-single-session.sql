-- =============================================================================
-- Rollback for Step 4: migration-2026-11-20-single-session.sql
-- =============================================================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_current_user_role()
  );

DROP FUNCTION IF EXISTS public.get_current_session_token();
DROP FUNCTION IF EXISTS public.claim_active_session(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.verify_active_session(TEXT);
DROP FUNCTION IF EXISTS public.assert_active_session_for_exam(TEXT);

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS active_session_token,
  DROP COLUMN IF EXISTS active_session_updated_at,
  DROP COLUMN IF EXISTS active_device_label;
