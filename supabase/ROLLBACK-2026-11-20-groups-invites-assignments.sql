-- =============================================================================
-- Rollback for Step 7: migration-2026-11-20-groups-invites-assignments.sql
-- =============================================================================
DROP FUNCTION IF EXISTS public.update_group_invite_settings(UUID, BOOLEAN, BOOLEAN, TIMESTAMPTZ, BOOLEAN, INT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.redeem_group_invite(TEXT);
DROP FUNCTION IF EXISTS public.preview_group_invite(TEXT);
DROP TABLE IF EXISTS public.exam_assignments;
DROP FUNCTION IF EXISTS public.get_current_user_grade();
DROP TRIGGER IF EXISTS trg_ensure_class_invite_code ON public.classes;
DROP FUNCTION IF EXISTS public.ensure_class_invite_code();
DROP INDEX IF EXISTS public.classes_invite_code_uidx;

ALTER TABLE public.classes
  DROP COLUMN IF EXISTS invite_code,
  DROP COLUMN IF EXISTS invite_enabled,
  DROP COLUMN IF EXISTS invite_expires_at,
  DROP COLUMN IF EXISTS max_students,
  DROP COLUMN IF EXISTS schedule_note;
