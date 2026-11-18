-- =============================================================================
-- ROLLBACK SCRIPT for migration-2026-11-18-secure-grading.sql
-- Run this in Supabase SQL Editor if you ever need to revert the secure function
-- =============================================================================

DROP FUNCTION IF EXISTS public.submit_exam_attempt_secure(UUID, JSONB);
