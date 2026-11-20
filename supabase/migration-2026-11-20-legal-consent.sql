-- ============================================================================
-- Pre-Onboarding Legal Gate: Egyptian Law No. 151 of 2020 (Guardian Consent)
-- Idempotent migration:
--   1. Adds consent & guardian columns to public.profiles
--   2. Creates immutable append-only public.consent_records audit table
--   3. Locks public.consent_records against anon and client UPDATE/DELETE
--   4. Updates public.handle_new_user() trigger to capture consent atomically
-- ============================================================================

-- 1. Extend public.profiles with legal consent audit fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_band TEXT CHECK (age_band IN ('under_18', 'adult_18_plus')),
  ADD COLUMN IF NOT EXISTS guardian_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS guardian_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS consent_version TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS guardian_verified_at TIMESTAMPTZ;

-- 2. Immutable append-only consent audit log
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  age_band TEXT NOT NULL CHECK (age_band IN ('under_18', 'adult_18_plus')),
  guardian_name TEXT NOT NULL DEFAULT '',
  guardian_email TEXT NOT NULL DEFAULT '',
  consent_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user_id
  ON public.consent_records(user_id, accepted_at DESC);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- Strict grant separation: zero anon access; authenticated users can only SELECT (never forge/delete)
REVOKE ALL ON TABLE public.consent_records FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.consent_records TO authenticated;

DROP POLICY IF EXISTS "Users read own consent records" ON public.consent_records;
CREATE POLICY "Users read own consent records"
  ON public.consent_records
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Staff read all consent records" ON public.consent_records;
CREATE POLICY "Staff read all consent records"
  ON public.consent_records
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND public.get_current_user_role() IN ('admin', 'teacher'));

-- 3. Update handle_new_user() trigger to persist legal consent atomically on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
DECLARE
  v_grade INT;
  v_age_band TEXT;
  v_guardian_name TEXT;
  v_guardian_email TEXT;
  v_consent_version TEXT;
  v_accepted_at TIMESTAMPTZ;
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'grade', '') ~ '^[0-9]+$' THEN
    v_grade := (NEW.raw_user_meta_data->>'grade')::int;
    IF v_grade < 1 OR v_grade > 12 THEN
      v_grade := NULL;
    END IF;
  ELSE
    v_grade := NULL;
  END IF;

  v_age_band := NEW.raw_user_meta_data->>'age_band';
  IF v_age_band NOT IN ('under_18', 'adult_18_plus') THEN
    v_age_band := NULL;
  END IF;

  v_guardian_name := COALESCE(TRIM(NEW.raw_user_meta_data->>'guardian_name'), '');
  v_guardian_email := COALESCE(LOWER(TRIM(NEW.raw_user_meta_data->>'guardian_email')), '');
  v_consent_version := COALESCE(TRIM(NEW.raw_user_meta_data->>'consent_version'), '');
  v_accepted_at := CASE WHEN v_consent_version <> '' THEN now() ELSE NULL END;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    grade,
    parent_phone,
    age_band,
    guardian_name,
    guardian_email,
    consent_version,
    consent_accepted_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    'student',
    v_grade,
    COALESCE(NEW.raw_user_meta_data->>'parent_phone', ''),
    v_age_band,
    v_guardian_name,
    v_guardian_email,
    v_consent_version,
    v_accepted_at
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_consent_version <> '' AND v_age_band IS NOT NULL THEN
    INSERT INTO public.consent_records (
      user_id,
      age_band,
      guardian_name,
      guardian_email,
      consent_version,
      accepted_at
    )
    VALUES (
      NEW.id,
      v_age_band,
      v_guardian_name,
      v_guardian_email,
      v_consent_version,
      v_accepted_at
    );
  END IF;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
