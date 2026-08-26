-- ============================================================
-- HAND-RUN 2026-08-26 — paste ALL of this into Supabase SQL Editor and click RUN
-- Fixes: (1) missing questions.params column  (2) missing classes tables
-- Safe to run twice — everything is IF NOT EXISTS / guarded.
-- ============================================================

-- 1) Param templates column
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS params JSONB;

COMMENT ON COLUMN public.questions.params IS 'Optional template spec {var:{min,max}}; {var} tokens substituted with seeded values per attempt.';

-- 2) Classes feature (tables were missing in production)
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 3 AND 12),
  teacher_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- 3) Policies (guarded so re-runs don't error)
DROP POLICY IF EXISTS "Admins can read all classes" ON public.classes;
CREATE POLICY "Admins can read all classes" ON public.classes FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Teachers read own classes" ON public.classes;
CREATE POLICY "Teachers read own classes" ON public.classes FOR SELECT USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers manage own classes" ON public.classes;
CREATE POLICY "Teachers manage own classes" ON public.classes FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Students read their classes" ON public.classes;
CREATE POLICY "Students read their classes" ON public.classes FOR SELECT USING (EXISTS (SELECT 1 FROM public.class_members WHERE class_id = classes.id AND student_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage classes" ON public.classes;
CREATE POLICY "Admins manage classes" ON public.classes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Students read own classes" ON public.class_members;
CREATE POLICY "Students read own classes" ON public.class_members FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Admins manage class_members" ON public.class_members;
CREATE POLICY "Admins manage class_members" ON public.class_members FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Teachers manage own class_members" ON public.class_members;
CREATE POLICY "Teachers manage own class_members" ON public.class_members FOR ALL USING (EXISTS (SELECT 1 FROM public.classes WHERE id = class_members.class_id AND teacher_id = auth.uid()));

-- DONE. Nothing below this line.
