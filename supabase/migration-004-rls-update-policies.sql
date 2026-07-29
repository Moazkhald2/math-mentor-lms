-- Add UPDATE policies for answers and exam_attempts (needed for upsert/finish)

CREATE POLICY "Users can update own answers"
  ON public.answers FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.exam_attempts WHERE id = attempt_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own attempts"
  ON public.exam_attempts FOR UPDATE USING (auth.uid() = user_id);
