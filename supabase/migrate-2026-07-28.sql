-- Add grade to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade INTEGER CHECK (grade BETWEEN 3 AND 12);

-- Classes
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

-- Activity logs
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

-- Add type to exams
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'exam' CHECK (type IN ('exam', 'practice'));

-- RLS policies
CREATE POLICY "Admins can read all classes" ON public.classes FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Teachers read own classes" ON public.classes FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Students read own classes" ON public.class_members FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students read their classes" ON public.classes FOR SELECT USING (EXISTS (SELECT 1 FROM public.class_members WHERE class_id = classes.id AND student_id = auth.uid()));
CREATE POLICY "Admins manage classes" ON public.classes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins manage class_members" ON public.class_members FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Teachers manage own class_members" ON public.class_members FOR ALL USING (EXISTS (SELECT 1 FROM public.classes WHERE id = class_members.class_id AND teacher_id = auth.uid()));
CREATE POLICY "Users read own activity_logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all activity_logs" ON public.activity_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users insert own activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
