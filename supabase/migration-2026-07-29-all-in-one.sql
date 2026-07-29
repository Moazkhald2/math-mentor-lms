-- ============================================================
-- COMPREHENSIVE MIGRATION: All pending schema changes
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- 1. Profiles: ensure all columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade INTEGER CHECK (grade BETWEEN 3 AND 12);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT NOT NULL DEFAULT '';

-- 2. Exams: add all missing columns
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'exam' CHECK (type IN ('exam', 'practice'));
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS grade INTEGER CHECK (grade BETWEEN 3 AND 12);
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false;

-- 3. Questions: add grade column
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS grade INTEGER CHECK (grade BETWEEN 3 AND 12);

-- 4. Answers: add max_points column
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS max_points INTEGER NOT NULL DEFAULT 1;

-- 5. Classes & class_members
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

-- 6. Activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  exam_id UUID REFERENCES public.exams(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_exam ON public.activity_logs(exam_id);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Classes
CREATE POLICY IF NOT EXISTS "Admins can read all classes" ON public.classes FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY IF NOT EXISTS "Teachers read own classes" ON public.classes FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY IF NOT EXISTS "Students read their classes" ON public.classes FOR SELECT USING (EXISTS (SELECT 1 FROM public.class_members WHERE class_id = classes.id AND student_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Admins manage classes" ON public.classes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Class members
CREATE POLICY IF NOT EXISTS "Students read own classes" ON public.class_members FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY IF NOT EXISTS "Admins manage class_members" ON public.class_members FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY IF NOT EXISTS "Teachers manage own class_members" ON public.class_members FOR ALL USING (EXISTS (SELECT 1 FROM public.classes WHERE id = class_members.class_id AND teacher_id = auth.uid()));

-- Activity logs
CREATE POLICY IF NOT EXISTS "Users read own activity_logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Admins read all activity_logs" ON public.activity_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY IF NOT EXISTS "Users insert own activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Exam attempts (admin/teacher read)
CREATE POLICY IF NOT EXISTS "Admins can read all attempts" ON public.exam_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

-- Answers (admin/teacher read)
CREATE POLICY IF NOT EXISTS "Admins can read all answers" ON public.answers FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')));

-- Questions (teacher delete)
CREATE POLICY IF NOT EXISTS "Teachers can delete questions" ON public.questions FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

-- Exams (teacher/admin manage)
DROP POLICY IF EXISTS "Teachers can manage exams" ON public.exams;
CREATE POLICY IF NOT EXISTS "Teachers and admins can manage exams" ON public.exams FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin')));
