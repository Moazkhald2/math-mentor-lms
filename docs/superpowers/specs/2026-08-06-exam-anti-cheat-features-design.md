# Design — Exam Anti-cheat & Attempt Features (Math Mentor LMS)

**Date:** 2026-08-06
**Status:** Approved by user (Mr. Moaz)

## Goal

Strengthen the timed-exam experience with:
1. Per-attempt question + option shuffle (unique to each attempt, not exam-wide).
2. Attempt limits (3 per exam) with best-score grading and 24h cooldown between retakes.
3. Time-seeded question variants (each attempt shows different but equivalent numbers).
4. Watermark overlay during exams.

These apply to `type='exam'` only. Practice sheets stay unlimited/untimed.

## Current behavior (baseline)

- `exams.shuffle_questions` exists but shuffle is seeded by the **exam id**, so every student sees the same order.
- No attempt cap, no cooldown, no variant system.
- AntiCheatGuard already handles: fullscreen enforcement, tab-switch/blur violations, copy/paste/context-menu blocks, devtools detection, timer, disqualification auto-submit.

## 1. Data model (Supabase migration)

### `questions`
- Add `variant_group_id UUID NULL`, indexed.
  - `NULL` = static question (unchanged behavior).
  - Non-null groups cluster variants of the same conceptual question. All variants within a group share: type, subject, topic, difficulty, explanation. Differ in: question_text, options, correct_answer.

### `exams`
- Add `max_attempts INT NOT NULL DEFAULT 1`.
- Add `cooldown_hours INT NOT NULL DEFAULT 0`.
  - Cohort: min hours a student must wait after one completed attempt before starting a new one.

### `exam_attempts`
- Add `seed TEXT` — the per-attempt deterministic seed captured at start. Everything (variant pick, shuffle order) derives from it, so refresh/regrade is consistent.
- Add `attempt_number INT` — 1-based index of this student's attempt for the exam.

### DB function `start_exam_attempt(...)` (SECURITY DEFINER)
Accepting `(p_exam_id, p_user_id)`:
- Reject if a non-completed `in_progress` attempt already exists.
- Count the student's completed attempts; if `>= max_attempts` → raise `'exam_no_attempts_left'`.
- If a previous completed attempt exists and `now() - completed_at < cooldown_hours` → raise `'exam_cooldown_active'`.
- Build seed from (`now()`, `p_user_id`, `random byte`) — e.g., 16-byte random hex.
- Insert attempt with `attempt_number = count + 1` and the seed. Return the attempt row (with seed).

Existing client `startAttempt` is replaced by an RPC call to this function so limits are enforced server-side (not bypassable from the client).

> Note: this function will appear literally in the SQL migration. All existing career migration files live in `supabase/`.

## 2. Variant selection + shuffling

### Variant selection (server-independent, deterministic)
On the client after fetching questions:
- For each `exam_questions` row whose `question.variant_group_id` is non-null:
  - Compute `idx = (hash(seed + question_group_id) % variant_count)`.
  - Fetch the group's variants; pick the one at `idx`.
- For static questions (`variant_group_id = NULL`), render as-is.

### Shuffle (per attempt)
Replace the exam-id seeded shuffle with a shuffle keyed by `attempt.seed`:
- `shuffleQuestions = seededShuffle(questionRows, attempt.seed+'_q')`.
- `Option: shuffleMultipleChoice(options, correct, attempt.seed + qid + attempt.attempt_number)`.

## 4. Best-score grading

- Student goal per exam = score kept across attempts = the maximum score of their completed attempts.
- Exam page, after each `completeAttempt`, is still not stored yet (existing) — add `exam_attempts` update storing `score`, `status='completed'`. Best score is computed by querying attempts for the exam+user. No extra table needed.
- On Results page: show "Best score: X%" alongside the current attempt's score, and how many attempts remain.

## 5. UI

### Student
- `Exams.tsx` card:
  - Show `Attempts: n/max_attempts` and best-score badge when ≥1 completed.
  - When attempt limit reached or cooldown active: hide `Start` button / disable, show `Next attempt in Xh Ym`.
- `Exam.tsx`:
  - Watermark overlay: semi-transparent repeating or corner-badge with `Student Full Name — Grade X — YYYY-MM-DD` above other content during the exam.
  - Before answer start: cooldown screen (countdown) when blocked; "no attempts left" screen with best score + link back.
  - Remove obsolete `existing` shuffle seed (`exam_id`) → use attempt seed.
- `Results.tsx`: Best-score callout when attempts remain, "No attempts left" when the cap reached.

### Practice
- Practice pages unaffected. All attempt/cooldown logic gated on `exam.type === 'exam'`.

## 6. Variant creation

- Seed pool: a migration inserts 2–4 variants per target question (same group id), covering grade-question banks. Stored via `variant_group_id`.
- Admin `AdminQuestions` / `AdminExams`:
  - "Variance" toggle on a question form → duplicates current into the group with new unique numbers and answer; keeps group id constant.

## 7. Testing

- Unit: `seededShuffle` given same seed deterministic; different seed different order. Variant modulo picks stable/stable + varied sets.
- RPC tests: no-attempts-left, cooldown-active blocks mixed status. `exam_attempts` inserts forbidden when cap reached.
- Integration (frontend): attempt page with capped attempts → cooldown screen; watermark polygon rendered; best-score UX.

## 8. Rollout / migration

- Single migration file in `supabase/` (e.g., `migration-2026-08-06-exam-anti-cheat.sql`):
  - `ALTER` the 3 tables.
  - Create `start_exam_attempt` function.
  - Add variant-group seed/backfill for a chosen set of questions (list in the file).
- Update `Exam.tsx`, `Exams.tsx`, `Results.tsx`, admin question/exam forms, RPC usage in `lib/exams.ts`.
- Run `npm run test` + `npm run lint` + `npm run build` before commit.

## Open questions intentionally deferred
- None. All decisions resolved during brainstorming.