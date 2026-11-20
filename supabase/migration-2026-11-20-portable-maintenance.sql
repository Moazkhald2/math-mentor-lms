-- =============================================================================
-- Migration: Step 5 — Portable Activity-Log Maintenance & Retention Settings
-- Date: 2026-11-20
-- Portable Free-Tier Design: Does NOT depend on pg_cron.
-- Provides an idempotent admin RPC `prune_old_activity_logs(p_retention_days)`
-- that can be triggered manually from Admin Dashboard or via optional scheduler.
-- Matching rollback: supabase/ROLLBACK-2026-11-20-portable-maintenance.sql
-- Matching test:     supabase/TEST-2026-11-20-portable-maintenance.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read system settings" ON public.system_settings;
CREATE POLICY "Staff can read system settings"
  ON public.system_settings FOR SELECT
  USING (public.get_current_user_role() IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Default retention: 90 days
INSERT INTO public.system_settings (key, value)
VALUES ('activity_log_retention_days', '90'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Index created_at for fast, low-IO range deletes on Supabase Free Nano
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON public.activity_logs (created_at ASC);

CREATE OR REPLACE FUNCTION public.prune_old_activity_logs(
  p_retention_days INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_jwt_role TEXT := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_is_service BOOLEAN := (v_jwt_role = 'service_role');
  v_days INT;
  v_deleted_activity INT := 0;
  v_deleted_rate_limits INT := 0;
BEGIN
  -- Authorize admin users OR direct service-role/cron maintenance callers
  IF NOT v_is_service THEN
    IF v_uid IS NULL OR public.get_current_user_role() != 'admin' THEN
      RAISE EXCEPTION 'unauthorized_admin_only';
    END IF;
  END IF;

  -- Determine retention days (clamp 7..3650 so active audit trails are never wiped)
  IF p_retention_days IS NOT NULL THEN
    v_days := LEAST(GREATEST(p_retention_days, 7), 3650);
    INSERT INTO public.system_settings (key, value, updated_at, updated_by)
    VALUES ('activity_log_retention_days', to_jsonb(v_days), now(), v_uid)
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = now(),
          updated_by = EXCLUDED.updated_by;
  ELSE
    SELECT COALESCE((value)::INT, 90) INTO v_days
    FROM public.system_settings
    WHERE key = 'activity_log_retention_days';
    v_days := LEAST(GREATEST(COALESCE(v_days, 90), 7), 3650);
  END IF;

  -- Prune expired activity logs
  DELETE FROM public.activity_logs
  WHERE created_at < now() - make_interval(days => v_days);
  GET DIAGNOSTICS v_deleted_activity = ROW_COUNT;

  -- Prune expired rate-limit counters (> 24 hours old) if table exists
  IF to_regclass('public.rpc_rate_limits') IS NOT NULL THEN
    DELETE FROM public.rpc_rate_limits
    WHERE created_at < now() - interval '24 hours';
    GET DIAGNOSTICS v_deleted_rate_limits = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'retention_days', v_days,
    'deleted_activity_logs', v_deleted_activity,
    'deleted_rate_limits', v_deleted_rate_limits,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prune_old_activity_logs(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prune_old_activity_logs(INT) TO authenticated;
