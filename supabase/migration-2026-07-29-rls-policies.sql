-- Add admin/teacher read access to all attempts
CREATE POLICY "Admins can read all attempts"
  ON public.exam_attempts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- Add admin/teacher read access to all answers
CREATE POLICY "Admins can read all answers"
  ON public.answers FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- Add DELETE policy for questions (teachers)
CREATE POLICY "Teachers can delete questions"
  ON public.questions FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
  );

-- Extend exam management to admins too
DROP POLICY IF EXISTS "Teachers can manage exams" ON public.exams;
CREATE POLICY "Teachers and admins can manage exams"
  ON public.exams FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );
