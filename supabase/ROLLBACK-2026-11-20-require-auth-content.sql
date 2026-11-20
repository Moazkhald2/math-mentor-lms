-- =============================================================================
-- Rollback for migration-2026-11-20-require-auth-content.sql
-- Restores legacy public read policy on public.exams and anon SELECT grant.
-- =============================================================================

GRANT SELECT ON TABLE public.exams TO anon;

DROP POLICY IF EXISTS "Authenticated users can read published exams" ON public.exams;
CREATE POLICY "Anyone can read published exams"
  ON public.exams FOR SELECT
  USING (is_published OR auth.uid() = created_by);
