-- ============================================================
-- HAND-RUN 2 — 2026-08-26: fix RLS infinite recursion on classes
-- Error was: 42P17 infinite recursion detected in policy
-- Cause: policies on classes and class_members referenced each other.
-- Fix: students resolve their classes through a SECURITY DEFINER
--      function instead of a cross-table policy.
-- Safe to re-run.
-- ============================================================

DROP POLICY IF EXISTS "Students read their classes" ON public.classes;
DROP POLICY IF EXISTS "Students read own classes" ON public.class_members;

CREATE OR REPLACE FUNCTION public.user_class_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT class_id FROM public.class_members WHERE student_id = auth.uid()
$$;

-- Students see only classes they belong to (no recursion: function bypasses RLS)
CREATE POLICY "Students read their classes" ON public.classes
FOR SELECT USING (id IN (SELECT public.user_class_ids()));

-- Students see only their own membership rows (self-column only, no cross-table)
CREATE POLICY "Students read own classes" ON public.class_members
FOR SELECT USING (auth.uid() = student_id);

-- DONE.
