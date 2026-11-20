-- =============================================================================
-- Migration: Concept / Outcome Taxonomy — Authoritative Concept Catalog,
--            Curriculum Outcomes, and Question<-Concept Mappings
-- Date: 2026-11-20
-- Adds 5 authoritative tables, widens public.questions.difficulty from 1-4 to
-- 1-6 (keeping INTEGER type for RPC compatibility), and enables strict
-- authenticated-only RLS (zero anon access; staff-only writes) on all 5 tables.
-- Safe to run multiple times (idempotent).
-- Matching rollback: supabase/ROLLBACK-2026-11-20-outcome-taxonomy.sql
-- =============================================================================

-- 0. Dependency note:
--    Relies on the hardened public.get_current_user_role() from Step 3
--    (SET search_path = public, returns 'anon' when auth.uid() IS NULL).
--    Do NOT redefine get_current_user_role() here.

-- 1. public.concepts — authoritative, curriculum-independent concept catalog.
--    IDs are stable, human-readable keys: CON-<3 letters>-<4 digits>.
CREATE TABLE IF NOT EXISTS public.concepts (
  concept_id TEXT PRIMARY KEY CHECK (concept_id ~ '^CON-[A-Z]{3}-[0-9]{4}$'),
  label TEXT NOT NULL,
  description TEXT,
  domain TEXT NOT NULL CHECK (domain IN ('NUM', 'ALG', 'MEA', 'GEO', 'STA', 'DAT')),
  grade_band_low INTEGER NOT NULL CHECK (grade_band_low BETWEEN 1 AND 12),
  grade_band_high INTEGER NOT NULL CHECK (grade_band_high BETWEEN 1 AND 12),
  unit_hint TEXT,
  -- JSONB array of { "alias": TEXT, "source": TEXT, "lang": TEXT }
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  prerequisite_concept_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated')),
  superseded_by TEXT REFERENCES public.concepts(concept_id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT concepts_grade_band_order_chk CHECK (grade_band_low <= grade_band_high)
);

COMMENT ON COLUMN public.concepts.aliases IS
  'JSONB array of {alias, source, lang} search aliases for keyword matching.';
COMMENT ON COLUMN public.concepts.superseded_by IS
  'Set when status = deprecated and a replacement concept exists.';

CREATE INDEX IF NOT EXISTS idx_concepts_domain_grade
  ON public.concepts (domain, grade_band_low, grade_band_high);
CREATE INDEX IF NOT EXISTS idx_concepts_aliases_gin
  ON public.concepts USING GIN (aliases);

-- 2. public.curricula — versioned source curriculum documents.
CREATE TABLE IF NOT EXISTS public.curricula (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  country TEXT,
  version TEXT,
  academic_year TEXT,
  term TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pilot', 'active', 'archived')),
  source_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. public.curriculum_outcomes — individual outcomes within a curriculum.
CREATE TABLE IF NOT EXISTS public.curriculum_outcomes (
  id BIGSERIAL PRIMARY KEY,
  curriculum_id TEXT NOT NULL REFERENCES public.curricula(id) ON DELETE CASCADE,
  outcome_code TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 12),
  stage TEXT,
  unit_code TEXT,
  lesson_no INTEGER,
  lesson_date DATE,
  text TEXT,
  source_pages TEXT,
  pedagogy JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT curriculum_outcomes_uidx UNIQUE (curriculum_id, outcome_code)
);

COMMENT ON COLUMN public.curriculum_outcomes.outcome_code IS
  'Stable per-curriculum code, e.g. G4-39.';
COMMENT ON COLUMN public.curriculum_outcomes.unit_code IS
  'Stable per-curriculum unit code, e.g. G4-U7.';

CREATE INDEX IF NOT EXISTS idx_curriculum_outcomes_grade
  ON public.curriculum_outcomes (curriculum_id, grade);
CREATE INDEX IF NOT EXISTS idx_curriculum_outcomes_lesson
  ON public.curriculum_outcomes (curriculum_id, unit_code, lesson_no);

-- 4. public.curriculum_outcome_concepts — outcome -> concept bridge (5th table).
CREATE TABLE IF NOT EXISTS public.curriculum_outcome_concepts (
  curriculum_id TEXT NOT NULL,
  outcome_code TEXT NOT NULL,
  concept_id TEXT NOT NULL
    REFERENCES public.concepts(concept_id) ON DELETE RESTRICT,
  mapping_kind TEXT NOT NULL CHECK (mapping_kind IN ('primary', 'supporting')),
  confidence NUMERIC(3, 2) CHECK (confidence BETWEEN 0 AND 1),
  PRIMARY KEY (curriculum_id, outcome_code, concept_id),
  CONSTRAINT curriculum_outcome_concepts_outcome_fk
    FOREIGN KEY (curriculum_id, outcome_code)
    REFERENCES public.curriculum_outcomes (curriculum_id, outcome_code)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_curriculum_outcome_concepts_concept
  ON public.curriculum_outcome_concepts (concept_id);

-- 5. public.question_concepts — MANY-TO-MANY: a question can carry ALL concepts
--    it covers. is_primary marks the main concept; difficulty_tier is the
--    authoritative per-concept difficulty (questions.difficulty is the
--    overall/legacy tier and may be widened independently).
CREATE TABLE IF NOT EXISTS public.question_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL
    REFERENCES public.questions(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL
    REFERENCES public.concepts(concept_id) ON DELETE RESTRICT,
  difficulty_tier SMALLINT NOT NULL CHECK (difficulty_tier BETWEEN 1 AND 6),
  is_primary BOOLEAN NOT NULL DEFAULT true,
  mapping_source TEXT NOT NULL
    CHECK (mapping_source IN ('auto_keyword', 'manual', 'ai_generated', 'reviewed')),
  confidence NUMERIC(3, 2) CHECK (confidence BETWEEN 0 AND 1),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT question_concepts_uidx UNIQUE (question_id, concept_id)
);

COMMENT ON COLUMN public.question_concepts.difficulty_tier IS
  'Authoritative per-concept difficulty, 1..6 (same scale as questions.difficulty).';
COMMENT ON COLUMN public.question_concepts.is_primary IS
  'True for the question''s main concept; a question may map to several concepts.';

CREATE INDEX IF NOT EXISTS idx_question_concepts_concept_tier
  ON public.question_concepts (concept_id, difficulty_tier);
CREATE INDEX IF NOT EXISTS idx_question_concepts_unreviewed
  ON public.question_concepts (mapping_source)
  WHERE mapping_source <> 'reviewed';

-- 6. Widen public.questions.difficulty from 1-4 to 1-6 (keep INTEGER type so
--    existing Postgres RPCs/views never hit int2/int4 return-type mismatches).
--    Drop the old inline check first (Postgres auto-name: questions_difficulty_check).
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_difficulty_check;
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_difficulty_check_v2;
ALTER TABLE public.questions
  ADD CONSTRAINT questions_difficulty_check_v2 CHECK (difficulty BETWEEN 1 AND 6);

COMMENT ON COLUMN public.questions.difficulty IS
  'Overall difficulty tier, 1..6: 1 easy, 2 medium, 3 hard, 4 challenge, 5 extreme, 6 above. Legacy 1-4 clients map new tier -> old value as {1:1, 2:2, 3:2, 4:3, 5:4, 6:4}. For per-concept difficulty, question_concepts.difficulty_tier is authoritative.';

-- 7. Row Level Security & Grants.
--    Strict authenticated-only reads (zero anon access); writes restricted to staff.
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_outcome_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_concepts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.concepts,
  public.curricula,
  public.curriculum_outcomes,
  public.curriculum_outcome_concepts,
  public.question_concepts
FROM anon;

REVOKE ALL ON SEQUENCE public.curriculum_outcomes_id_seq FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.concepts,
  public.curricula,
  public.curriculum_outcomes,
  public.curriculum_outcome_concepts,
  public.question_concepts
TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.curriculum_outcomes_id_seq TO authenticated;

DROP POLICY IF EXISTS "Anyone can read concepts" ON public.concepts;
DROP POLICY IF EXISTS "Authenticated can read concepts" ON public.concepts;
CREATE POLICY "Authenticated can read concepts"
  ON public.concepts FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Staff can manage concepts" ON public.concepts;
CREATE POLICY "Staff can manage concepts"
  ON public.concepts FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('teacher', 'admin'))
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Anyone can read curricula" ON public.curricula;
DROP POLICY IF EXISTS "Authenticated can read curricula" ON public.curricula;
CREATE POLICY "Authenticated can read curricula"
  ON public.curricula FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Staff can manage curricula" ON public.curricula;
CREATE POLICY "Staff can manage curricula"
  ON public.curricula FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('teacher', 'admin'))
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Anyone can read curriculum outcomes" ON public.curriculum_outcomes;
DROP POLICY IF EXISTS "Authenticated can read curriculum outcomes" ON public.curriculum_outcomes;
CREATE POLICY "Authenticated can read curriculum outcomes"
  ON public.curriculum_outcomes FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Staff can manage curriculum outcomes" ON public.curriculum_outcomes;
CREATE POLICY "Staff can manage curriculum outcomes"
  ON public.curriculum_outcomes FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('teacher', 'admin'))
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Anyone can read curriculum outcome concepts" ON public.curriculum_outcome_concepts;
DROP POLICY IF EXISTS "Authenticated can read curriculum outcome concepts" ON public.curriculum_outcome_concepts;
CREATE POLICY "Authenticated can read curriculum outcome concepts"
  ON public.curriculum_outcome_concepts FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Staff can manage curriculum outcome concepts" ON public.curriculum_outcome_concepts;
CREATE POLICY "Staff can manage curriculum outcome concepts"
  ON public.curriculum_outcome_concepts FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('teacher', 'admin'))
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));

DROP POLICY IF EXISTS "Anyone can read question concepts" ON public.question_concepts;
DROP POLICY IF EXISTS "Authenticated can read question concepts" ON public.question_concepts;
CREATE POLICY "Authenticated can read question concepts"
  ON public.question_concepts FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Staff can manage question concepts" ON public.question_concepts;
CREATE POLICY "Staff can manage question concepts"
  ON public.question_concepts FOR ALL TO authenticated
  USING (public.get_current_user_role() IN ('teacher', 'admin'))
  WITH CHECK (public.get_current_user_role() IN ('teacher', 'admin'));
