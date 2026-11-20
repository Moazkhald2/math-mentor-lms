-- =============================================================================
-- Verification Test for migration-2026-11-20-outcome-taxonomy.sql
-- Safe to run in Supabase SQL Editor — wrapped in BEGIN; ... ROLLBACK;
-- Makes ZERO permanent changes.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'concepts',
    'curricula',
    'curriculum_outcomes',
    'curriculum_outcome_concepts',
    'question_concepts'
  ];
  rls_on BOOLEAN;
  col_type TEXT;
  fn_config TEXT[];
  err_caught BOOLEAN;
BEGIN
  -- 1. Verify all 5 tables exist, have RLS enabled, and revoke anon SELECT
  FOREACH tbl IN ARRAY tables LOOP
    SELECT c.relrowsecurity INTO rls_on
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = tbl;

    IF rls_on IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'FAIL: RLS not enabled on public.%', tbl;
    END IF;

    IF has_table_privilege('anon', 'public.' || tbl, 'SELECT') THEN
      RAISE EXCEPTION 'FAIL: anon still has SELECT privilege on public.%', tbl;
    END IF;
  END LOOP;

  -- 2. Verify hardened get_current_user_role() was NOT downgraded
  SELECT proconfig INTO fn_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_current_user_role';

  IF fn_config IS NULL OR NOT ('search_path=public' = ANY(fn_config)) THEN
    RAISE EXCEPTION 'FAIL: get_current_user_role() lost SET search_path = public!';
  END IF;

  -- 3. Verify questions.difficulty stayed INTEGER (no int2/int4 RPC mismatch)
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'questions'
    AND column_name = 'difficulty';

  IF col_type <> 'integer' THEN
    RAISE EXCEPTION 'FAIL: questions.difficulty type is %, expected integer', col_type;
  END IF;

  -- 4. Verify curriculum_outcomes.grade rejects 13 and accepts 7
  INSERT INTO public.curricula (id, display_name, status)
  VALUES ('TEST-CURR-1', 'Test Curriculum', 'draft');

  INSERT INTO public.curriculum_outcomes (curriculum_id, outcome_code, grade)
  VALUES ('TEST-CURR-1', 'G7-01', 7);

  err_caught := FALSE;
  BEGIN
    INSERT INTO public.curriculum_outcomes (curriculum_id, outcome_code, grade)
    VALUES ('TEST-CURR-1', 'G13-01', 13);
  EXCEPTION WHEN check_violation THEN
    err_caught := TRUE;
  END;
  IF NOT err_caught THEN
    RAISE EXCEPTION 'FAIL: curriculum_outcomes.grade allowed 13!';
  END IF;

  -- 5. Verify concepts + bridge insert works cleanly
  INSERT INTO public.concepts (concept_id, label, domain, grade_band_low, grade_band_high)
  VALUES ('CON-ALG-9999', 'Test Linear Concept', 'ALG', 7, 8);

  INSERT INTO public.curriculum_outcome_concepts (curriculum_id, outcome_code, concept_id, mapping_kind)
  VALUES ('TEST-CURR-1', 'G7-01', 'CON-ALG-9999', 'primary');

  -- 6. Verify questions.difficulty accepts 6 and rejects 7
  INSERT INTO public.questions (type, subject, topic, difficulty, question_text, correct_answer)
  VALUES ('short_answer', 'Math', 'Test', 6, 'Test tier 6', '42');

  err_caught := FALSE;
  BEGIN
    INSERT INTO public.questions (type, subject, topic, difficulty, question_text, correct_answer)
    VALUES ('short_answer', 'Math', 'Test', 7, 'Test tier 7', '42');
  EXCEPTION WHEN check_violation THEN
    err_caught := TRUE;
  END;
  IF NOT err_caught THEN
    RAISE EXCEPTION 'FAIL: questions.difficulty allowed 7!';
  END IF;

  RAISE NOTICE 'ALL OUTCOME TAXONOMY CHECKS PASSED!';
END $$;

ROLLBACK;
