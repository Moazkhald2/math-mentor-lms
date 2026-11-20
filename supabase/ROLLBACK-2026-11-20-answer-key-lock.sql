-- =============================================================================
-- Rollback for Step 3: migration-2026-11-20-answer-key-lock.sql
-- WARNING: Restoring open read policies re-exposes question keys. Use only
-- for emergency recovery while diagnosing a migration issue.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_exam_questions_safe(UUID, UUID);
DROP FUNCTION IF EXISTS public.save_attempt_answers_draft(UUID, JSONB);
DROP FUNCTION IF EXISTS public.get_attempt_review_safe(UUID);
DROP FUNCTION IF EXISTS public.get_practice_questions_safe(UUID);
DROP FUNCTION IF EXISTS public.start_practice_attempt(UUID);
DROP FUNCTION IF EXISTS public.upsert_practice_answer(UUID, UUID, TEXT, BOOLEAN, INT);
DROP FUNCTION IF EXISTS public.finish_practice_attempt(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.get_student_weak_points();
DROP FUNCTION IF EXISTS public.get_student_bookmarks();
DROP FUNCTION IF EXISTS public.check_rpc_rate_limit(TEXT, INT, INT);
DROP FUNCTION IF EXISTS public.answers_match_server(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.normalize_math_answer(TEXT);

DROP TABLE IF EXISTS public.rpc_rate_limits;
DROP TABLE IF EXISTS public.exam_submissions;

DROP POLICY IF EXISTS "Staff can read all questions" ON public.questions;
CREATE POLICY "Anyone can read questions"
  ON public.questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage exam questions" ON public.exam_questions;
CREATE POLICY "Anyone can read exam questions"
  ON public.exam_questions FOR SELECT USING (true);

CREATE POLICY "Users can insert own attempts"
  ON public.exam_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts"
  ON public.exam_attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own answers"
  ON public.answers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.exam_attempts WHERE id = attempt_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update own answers"
  ON public.answers FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.exam_attempts WHERE id = attempt_id AND user_id = auth.uid())
  );
