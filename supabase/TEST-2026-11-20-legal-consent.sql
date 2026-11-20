-- Verification test for migration-2026-11-20-legal-consent.sql
-- Safe to run in Supabase SQL Editor (rolls back inside transaction)
BEGIN;

DO $$
DECLARE
  v_rls BOOLEAN;
  v_anon_priv BOOLEAN;
  v_auth_insert BOOLEAN;
  v_auth_delete BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO v_rls
  FROM pg_class WHERE relname = 'consent_records' AND relnamespace = 'public'::regnamespace;
  IF NOT COALESCE(v_rls, false) THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on public.consent_records';
  END IF;

  SELECT has_table_privilege('anon', 'public.consent_records', 'SELECT') INTO v_anon_priv;
  IF v_anon_priv THEN
    RAISE EXCEPTION 'FAIL: anon still has SELECT on public.consent_records';
  END IF;

  SELECT has_table_privilege('authenticated', 'public.consent_records', 'INSERT') INTO v_auth_insert;
  SELECT has_table_privilege('authenticated', 'public.consent_records', 'DELETE') INTO v_auth_delete;
  IF v_auth_insert OR v_auth_delete THEN
    RAISE EXCEPTION 'FAIL: authenticated role should not have direct INSERT/DELETE on consent_records';
  END IF;

  RAISE NOTICE 'PASS: public.consent_records RLS, anon block, and immutability verified.';
END $$;

ROLLBACK;
