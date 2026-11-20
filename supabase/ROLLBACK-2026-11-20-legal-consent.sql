-- Rollback for migration-2026-11-20-legal-consent.sql
DROP TABLE IF EXISTS public.consent_records;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS age_band,
  DROP COLUMN IF EXISTS guardian_name,
  DROP COLUMN IF EXISTS guardian_email,
  DROP COLUMN IF EXISTS consent_version,
  DROP COLUMN IF EXISTS consent_accepted_at,
  DROP COLUMN IF EXISTS guardian_verified_at;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, grade, parent_phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'student',
    (NEW.raw_user_meta_data->>'grade')::int,
    COALESCE(NEW.raw_user_meta_data->>'parent_phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$func$;
