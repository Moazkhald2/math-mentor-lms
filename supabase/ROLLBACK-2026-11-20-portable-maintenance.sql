-- =============================================================================
-- Rollback for Step 5: migration-2026-11-20-portable-maintenance.sql
-- =============================================================================
DROP FUNCTION IF EXISTS public.prune_old_activity_logs(INT);
DROP INDEX IF EXISTS public.idx_activity_logs_created_at;
DROP TABLE IF EXISTS public.system_settings;
