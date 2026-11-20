-- =============================================================================
-- Migration: Step 6 — All-Grades (1–12) Constraint Alignment
-- Date: 2026-11-20
-- Widens grade CHECK constraints on profiles, exams, and classes from 3..12 to 1..12
-- so all K-12 grades are supported through one consistent schema & frontend config.
-- Safe to run multiple times (idempotent).
-- =============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Dynamically drop any existing grade CHECK constraint on profiles, exams, classes
  FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN ('public.profiles'::regclass, 'public.exams'::regclass, 'public.classes'::regclass)
      AND pg_get_constraintdef(oid) ILIKE '%grade%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_grade_1_12_check CHECK (grade IS NULL OR (grade BETWEEN 1 AND 12));

ALTER TABLE public.exams
  ADD CONSTRAINT exams_grade_1_12_check CHECK (grade IS NULL OR (grade BETWEEN 1 AND 12));

ALTER TABLE public.classes
  ADD CONSTRAINT classes_grade_1_12_check CHECK (grade BETWEEN 1 AND 12);
