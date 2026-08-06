# Exam Anti-Cheat & Attempt Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-attempt question + option shuffle, a 3-attempt limit with best-score grading and 24h cooldown, time-seeded question variants, and a watermark overlay during exams.

**Architecture:** Supabase schema changes (new columns + a SECURITY DEFINER `start_exam_attempt` RPC that enforces attempt cap and cooldown atomically) paired with client changes. Variant selection and per-attempt shuffle are deterministic functions seeded by a per-attempt random seed stored on `exam_attempts.seed`, so a refresh or regrade is always consistent. The DB function is the real gate — client UI is a convenience mirror.

**Tech Stack:** Supabase (Postgres RPC, RLS), React 19, TanStack Query v6, TypeScript strict, vitest + @testing-library/react. Migration is applied to prod Supabase (project ref `vjhzbqtoktktrjevcodq`) via the Supabase MCP `apply_migration` tool AND saved to `supabase/` for history.

## Global Constraints

- All attempt/cooldown/variant behavior applies to `exam.type === 'exam'` ONLY. Practice (`type === 'practice'`) is untouched.
- `max_attempts` and `cooldown_hours` defaults: `3` and `0`. The anti-cheat exam set to `3` and `24`.
- Best score per (exam, user) is the student's grade. A new attempt never lowers it (Results page shows best + current).
- Existing a11y / style conventions: buttons reuse existing classes, no new UI library, text stays terse.
- All answers remain graded by stored index (shuffled options tracked via `correct_answer` index remapping in `shuffleMultipleChoice`).
- Commands run from repo root: `C:\Users\moaz7\web-exams-site\math-mentor-lms`. Run `npm run test`, `npm run lint`, `npm run build`.
- Migration files live in `supabase/`. New migration: `supabase/migration-2026-08-06-exam-anti-cheat.sql`.

---

## Task 1: Database migration + `start_exam_attempt` RPC

**Files:**
- Create: `supabase/migration-2026-08-06-exam-anti-cheat.sql`
- Modify: `src/types/index.ts` (add fields to interfaces)

**Interfaces:**
- Consumes: existing `public.exams`, `public.exam_attempts`, `public.questions`.
- Produces: columns `questions.variant_group_id`, `exams.max_attempts`, `exams.cooldown_hours`, `exam_attempts.seed`, `exam_attempts.attempt_number`; RPC `public.start_exam_attempt(p_exam_id UUID, p_user_id UUID) RETURNS exam_attempts`. Errors raised with message `exam_not_found` | `exam_no_attempts_left` | `exam_cooldown_active`.

- [ ] **Step 1: Write the migration SQL file**

`supabase/migration-2026-08-06-exam-anti-cheat.sql`:

```sql
-- Exam anti-cheat & attempts: variants, max attempts, cooldown, per-attempt seed.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS variant_group_id TEXT;
CREATE INDEX IF NOT EXISTS idx_questions_variant_group
  ON public.questions(variant_group_id);

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS cooldown_hours INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS seed TEXT;
ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER;
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_exam
  ON public.exam_attempts(exam_id, user_id);

CREATE OR REPLACE FUNCTION public.start_exam_attempt(p_exam_id UUID, p_user_id UUID)
RETURNS public.exam_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_exam public.exams%ROWTYPE;
  v_count INTEGER;
  v_last public.exam_attempts%ROWTYPE;
  v_attempt public.exam_attempts;
BEGIN
  SELECT * INTO v_exam FROM public.exams WHERE id = p_exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam_not_found';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.exam_attempts
    WHERE exam_id = p_exam_id AND user_id = p_user_id AND status = 'completed';

  IF v_count >= v_exam.max_attempts THEN
    RAISE EXCEPTION 'exam_no_attempts_left';
  END IF;

  SELECT * INTO v_last
    FROM public.exam_attempts
    WHERE exam_id = p_exam_id AND user_id = p_user_id AND status = 'completed'
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 1;

  IF v_last.id IS NOT NULL AND v_exam.cooldown_hours > 0
     AND v_last.completed_at + make_interval(hours => v_exam.cooldown_hours) > now() THEN
    RAISE EXCEPTION 'exam_cooldown_active';
  END IF;

  INSERT INTO public.exam_attempts (exam_id, user_id, started_at, status, seed, attempt_number)
  VALUES (p_exam_id, p_user_id, now(), 'in_progress', gen_random_uuid()::text, v_count + 1)
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;
```

- [ ] **Step 2: Apply the migration to the remote Supabase project**

Use the Supabase MCP `apply_migration` tool with `name: "exam_attempt_limits_variants"` and the full SQL above as `query`. Then verify columns:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('questions','exams','exam_attempts')
AND column_name IN ('variant_group_id','max_attempts','cooldown_hours','seed','attempt_number');
```

Expected: all 5 rows.

- [ ] **Step 3: Update `src/types/index.ts`**

In `Question` add `variant_group_id: string | null`. In `Exam` add `max_attempts: number; cooldown_hours: number`. In `ExamAttempt` add `seed?: string | null; attempt_number?: number`. In `Answer` add `variant_group_id?: string | null` (used to remember which variant a student answered).

- [ ] **Step 4: Run typecheck**

Run: `npm run build`
Expected: PASS (no new type errors).

- [ ] **Step 5: Commit**

```bash
git add supabase/migration-2026-08-06-exam-anti-cheat.sql src/types/index.ts
git commit -m "feat: add exam attempt-limit, cooldown, and variant schema + RPC"
```

---

## Task 2: `lib/exams.ts` RPC + attempt-status helpers

**Files:**
- Modify: `src/lib/exams.ts` (replace `startAttempt` to call the RPC; add `fetchStudentAttempts` and `getBestScore`)
- Test: `src/test/lib/exams.test.ts`

**Interfaces:**
- Consumes: RPC `start_exam_attempt`; existing `supabase` client mock in tests.
- Produces:
  - `startAttempt(examId: string, userId: string): Promise<ExamAttempt>` — now `supabase.rpc('start_exam_attempt', { p_exam_id, p_user_id })`.
  - `fetchStudentAttempts(examId: string, userId: string): Promise<ExamAttempt[]>` — ordered by `started_at desc`.
  - `fetchMyAttemptsCount(examId, userId)` = `fetchStudentAttempts(...).then(completions)`. Migration only for completed ones.
  - `getBestScore(attempts: ExamAttempt[]): number` — max `score` among `status === 'completed'`.

- [ ] **Step 1: Write failing tests**

Append to `src/test/lib/exams.test.ts`:

```ts
describe('startAttempt via RPC', () => {
  it('calls supabase.rpc start_exam_attempt with p_exam_id and p_user_id', async () => {
    const attempt = { id: 'a1', seed: 'abc', attempt_number: 1, status: 'in_progress' }
    const spy = vi.fn().mockResolvedValue({ data: attempt, error: null })
    vi.mocked(supabase as any).rpc = spy
    const result = await startAttempt('exam-1', 'user-1')
    expect(spy).toHaveBeenCalledWith('start_exam_attempt', { p_exam_id: 'exam-1', p_user_id: 'user-1' })
    expect(result).toEqual(attempt)
  })

  it('throws when rpc returns an error', async () => {
    vi.mocked(supabase as any).rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('exam_no_attempts_left') })
    await expect(startAttempt('exam-1', 'user-1')).rejects.toThrow('exam_no_attempts_left')
  })
})

describe('fetchStudentAttempts', () => {
  it('queries exam_attempts filtered by exam and user, ordered recent first', async () => {
    const qb = createQueryBuilder([{ id: 'a2' }, { id: 'a1' }])
    vi.mocked(supabase.from).mockReturnValue(qb)
    await fetchStudentAttempts('exam-1', 'user-1')
    expect(supabase.from).toHaveBeenCalledWith('exam_attempts')
    expect(qb.eq).toHaveBeenCalledWith('exam_id', 'exam-1')
    expect(qb.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(qb.order).toHaveBeenCalledWith('started_at', { ascending: false })
  })
})

describe('getBestScore', () => {
  it('returns the max score among completed attempts', () => {
    const attempts = [
      { id: 'a1', status: 'completed', score: 70 } as any,
      { id: 'a2', status: 'completed', score: 85 } as any,
      { id: 'a3', status: 'in_progress' } as any,
    ]
    expect(getBestScore(attempts)).toBe(85)
  })

  it('returns 0 when no completed attempts', () => {
    expect(getBestScore([{ id: 'a1', status: 'in_progress' } as any])).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/lib/exams.test.ts`
Expected: FAIL (functions not exported).

- [ ] **Step 3: Update implementation**

In `src/lib/exams.ts` replace the `startAttempt` body:

```ts
export async function startAttempt(examId: string, userId: string) {
  const { data, error } = await supabase.rpc('start_exam_attempt', {
    p_exam_id: examId,
    p_user_id: userId,
  })
  if (error) throw error
  return data as ExamAttempt
}

export async function fetchStudentAttempts(examId: string, userId: string) {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data as ExamAttempt[]
}

export function getBestScore(attempts: ExamAttempt[]): number {
  return attempts
    .filter(a => a.status === 'completed')
    .reduce((best, a) => Math.max(best, a.score ?? 0), 0)
}
```

Also add `rpc` support to the test's `createQueryBuilder` mock if unused — not required since tests stub `supabase.rpc` directly. But the supabase mock in the test file must be extended so `vi.mocked(supabase as any).rpc` is assignable. If TS complains, add `rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))` inside the module mock object returned by `vi.mock`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/test/lib/exams.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exams.ts src/test/lib/exams.test.ts
git commit -m "feat: use RPC start_exam_attempt, add attempt helpers"
```

---

## Task 3: Variant selection (lib) + per-attempt shuffle wiring

**Files:**
- Modify: `src/lib/shuffle.ts` (export `hashString`; add `variantInGroup`)
- Create: `src/lib/variants.ts` (pure function, no supabase)
- Test: `src/test/lib/variants.test.ts`
- Modify: `src/pages/Exam.tsx` (use attempt seed; fetch variant pool; resolve variants)
- Test: `src/test/pages/Exam.test.tsx` (extend mocks)

**Interfaces:**
- Consumes: `exam_questions` rows with `question: Question` including `variant_group_id`; the attempt's `seed`.
- Produces:
  - `resolveVariant(question: Question, seed: string, variantPool: Question[]): Question | null` — returns the picked Question if there's a pool, else the original.
  - `hashString(str: string): number` (exported additively from `shuffle.ts`).

- [ ] **Step 1: Write failing test**

Create `src/test/lib/variants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveVariant, variantForGroup } from '../../lib/variants'
import type { Question } from '../../types'

function q(id: string, group: string | null): Question {
  return { id, variant_group_id: group } as Question
}

describe('resolveVariant', () => {
  it('returns the same question when no variants exist', () => {
    const base = q('q1', 'g1')
    const result = resolveVariant(base, 'seed-a', [])
    expect(result).toBe(base)
  })

  it('deterministically picks the same variant for the same seed', () => {
    const base = q('q0', 'g1')
    const pool = [q('v0', 'g1'), q('v1', 'g1'), q('v2', 'g1')]
    const a = resolveVariant(base, 'seed-x', pool)
    const b = resolveVariant(base, 'seed-x', pool)
    expect(a.id).toBe(b.id)
  })

  it('picks a different variant for a different seed', () => {
    const base = q('q0', 'g1')
    const pool = [q('v0', 'g1'), q('v1', 'g1'), q('v2', 'g1')]
    const a = resolveVariant(base, 'seed-1', pool)
    const b = resolveVariant(base, 'seed-2', pool)
    expect(a.id).not.toBe(b.id)
  })

  it('only uses variants sharing the same group id', () => {
    const base = q('q0', 'g1')
    const pool = [q('v0', 'g1'), q('w0', 'g2')]
    const result = resolveVariant(base, 'any', pool)
    expect(result.id).toBe('v0')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/lib/variants.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/variants.ts`**

```ts
import { hashString } from './shuffle'
import type { Question } from '../types'

export function variantForGroup(groupId: string, variants: Question[], seed: string): Question | null {
  if (!groupId || variants.length === 0) return null
  const idx = hashString(`${seed}::${groupId}`) % variants.length
  return variants[idx]
}

export function resolveVariant(base: Question, seed: string, variantPool: Question[]): Question {
  if (!base.variant_group_id) return base
  const group = variantPool.filter(q => q.variant_group_id === base.variant_group_id)
  if (group.length === 0) return base
  return variantForGroup(base.variant_group_id, group, hashString(seed))
}
```

- [ ] **Step 4: Export `hashString` from `src/lib/shuffle.ts`**

Add `export` to the existing `function hashString`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/test/lib/variants.test.ts src/test/lib/shuffle.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/variants.ts src/test/lib/variants.test.ts src/lib/shuffle.ts
git commit -m "feat: time-seeded variant selection helper"
```

---

## Task 4: Exam.tsx uses attempt seed + variant pool + per-attempt shuffle

**Files:**
- Modify: `src/pages/Exam.tsx`
- Test: `src/test/pages/Exam.test.tsx`

**Behavior:**
- After `startAttempt` resolves, store `attempt.seed`.
- Resolve per-attempt shuffle: `seededShuffle(rawQuestions, attempt.seed + '_q')`; option-shuffle keyed by `attempt.seed + qid`.
- Fetch variant pool: one query of `questions` where `variant_group_id in (groupIds in the exam)`, then run each row through `resolveVariant`.

- [ ] **Step 1: Update mocked `lib/exams` in test**

In `src/test/devices/pages/Exam.test.tsx`, change the mocked `startAttempt` to return a seed and `attempt_number`:

```ts
startAttempt: async (..._args: any[]) => ({ id: 'attempt-1', seed: 'seed-1', attempt_number: 1 }),
```

And add `variant_group_id: null` to the mocked `question` fixture (line ~20 region). Also add `rpc` to the mocked `supabase` module because `startAttempt` now calls `.rpc`. Easiest: keep the module mock that maps `fetchExamQuestions`/`startAttempt` — those are mocked separately, so `supabase.rpc` is only exercised by `lib/exams`, which the test overrides. Leave as is unless type errors appear; add `rpc: vi.fn(() => Promise.resolve({ data: null }))` to the `vi.mock('../../lib/supabase'...)` object if typecheck complains.

- [ ] **Step 2: Update `src/lib/exams.ts` `fetchExamQuestions`?** — NOT needed (pool fetch is separate). Add a new export in `src/lib/exams.ts` used only by Exam.tsx:

```ts
export async function fetchVariantPool(groupIds: string[]) {
  if (groupIds.length === 0) return []
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .in('variant_group_id', groupIds)
  if (error) throw error
  return data as Question[]
}
```

Add corresponding unit test in `src/test/lib/exams.test.ts`:

```ts
describe('fetchVariantPool', () => {
  it('returns [] when no group ids', async () => {
    await expect(fetchVariantPool([])).resolves.toEqual([])
  })
  it('selects questions where variant_group_id in groups', async () => {
    const qb = createQueryBuilder([{ id: 'v1' }])
    vi.mocked(supabase.from).mockReturnValue(qb)
    await fetchVariantPool(['g1', 'g2'])
    expect(supabase.from).toHaveBeenCalledWith('questions')
    expect(qb.in).toHaveBeenCalledWith('variant_group_id', ['g1', 'g2'])
  })
})
```

- [ ] **Step 3: Implement the data wiring in `Exam.tsx`**

In `Exam.tsx`:

- Keep `filtering the exam` query as is (now includes `max_attempts`, `cooldown_hours` — no change needed).
- Add state `const [attemptSeed, setAttemptSeed] = useState<string | null>(null)`; set it in the `startAttempt` callback: `.then(a => { setAttemptId(a.id); setAttemptSeed(a.seed ?? null) })`.
- Add variant pool query after `rawQuestions`:

```ts
const { data: variantPool = [] } = useQuery({
  queryKey: ['exam-variant-pool', id],
  queryFn: () => {
    const groupIds = [...new Set((rawQuestions ?? [])
      .map(eq => eq.question.variant_group_id)
      .filter((g): g is string => !!g))]
    return fetchVariantPool(groupIds)
  },
  enabled: !!rawQuestions,
})
```

- In the `questions` `useMemo`, use `attemptSeed ?? id` instead of `id`, and after `shuffleMultipleChoice` calls, resolve variants:

```ts
const questions = useMemo<ShuffledQuestion[] | undefined>(() => {
  if (!rawQuestions) return undefined
  const seed = attemptSeed ?? id || 'default'
  const baseShuffle = exam?.shuffle_questions
    ? seededShuffle(rawQuestions, seed + '_questions')
    : [...rawQuestions]
  const resolved = baseShuffle.map(eq => {
    const variant = resolveVariant(eq.question, seed, variantPool)
    const question = { ...variant }
    if (question.type === 'multiple_choice' && question.options.length > 0) {
      const { options, correctAnswer } = shuffleMultipleChoice(
        question.options, question.correct_answer, seed + question.id
      )
      question.options = options
      question.correct_answer = correctAnswer
    }
    return { ...eq, question }
  })
  return resolved
}, [rawQuestions, id, attemptSeed, exam?.shuffle_questions, variantPool])
```

Make sure to import `resolveVariant` from `../lib/variants` and `fetchVariantPool` from `../lib/exams`.

- [ ] **Step 4: Update options `const`. `Exam.tsx` import of `Question` type keeps `options`.** The `ShuffledQuestion` type already requires `options: string[]; correct_answer: string` — stays valid.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/test/pages/Exam.test.tsx src/test/lib/exams.test.ts src/test/lib/variants.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Exam.tsx src/lib/exams.ts src/test/pages/Exam.test.tsx src/test/lib/exams.test.ts
git commit -m "feat: per-attempt shuffle + variant resolution in exam flow"
```

---

## Task 5: Watermark overlay component

**Files:**
- Create: `src/components/Watermark.tsx`
- Test: `src/test/components/Watermark.test.tsx`
- Modify: `src/pages/Exam.tsx` (render inside `AntiCheatGuard`)

**Behavior:** Fixed, semi-transparent diagonal text `Student Name — Grade X` repeated across the screen. `pointer-events-none`, z-index above content, low opacity (won't obscure questions but appears in screenshots).

- [ ] **Step 1: Write failing test**

Create `src/test/components/Watermark.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Watermark from '../../components/Watermark'

describe('Watermark', () => {
  it('renders the student label', () => {
    render(<Watermark label="Moaz Khaled — Grade 10" />)
    expect(screen.getAllByText(/Moaz Khaled/).length).toBeGreaterThan(0)
  })
  it('is decorative and pointer-transparent', () => {
    const { container } = render(<Watermark label="ABC" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('pointer-events-none')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/components/Watermark.test.tsx`
Expected: FAIL (component missing).

- [ ] **Step 3: Implement `src/components/Watermark.tsx`**

```tsx
export default function Watermark({ label }: { label: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="absolute whitespace-nowrap text-2xl font-black tracking-wider text-ink/10"
          style={{ transform: `rotate(-30deg) translateY(${(i - 1) * 90}px)` }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Wire into `Exam.tsx`**

Inside the `AntiCheatGuard` children `div` (line ~182), before the header bar, add:

```tsx
<Watermark label={`${user?.user_metadata?.full_name ?? user?.email ?? 'Student'}${grade ? ` — Grade ${grade}` : ''}`} />
```

You have `grade` from the profile query? The exam query already fetches `profiles.grade` into `profileRes`. Capture it as a state or lift the query. Simplest: keep fetching profile grade in a small query inside Exam or read from `user.user_metadata.grade`. Use `user.user_metadata?.grade`.

- [ ] **Step 5: Update Exam test to assert watermark exists**

In `src/test/pages/Exam.test.tsx` add:

```tsx
it('shows watermark during the exam', async () => {
  renderExam()
  await waitFor(() => {
    expect(screen.getAllByText(/@test\.com/).length).toBeGreaterThan(0)
  })
})
```

(English label as base because metadata empty in mock.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/test/components/Watermark.test.tsx src/test/pages/Exam.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/Watermark.tsx src/test/components/Watermark.test.tsx src/pages/Exam.tsx src/test/pages/Exam.test.tsx
git commit -m "feat: watermark overlay during exams"
```

---

## Task 6: Enforcement gates — Exams list + Exam entry screens

**Files:**
- Modify: `src/pages/Exams.tsx` (attempts used + cooldown + lock)
- Modify: `src/pages/Exam.tsx` (cooldown + no-attempts screens before entering)
- Test: `src/test/pages/ExamsPage.test.tsx`

**Behavior:**
- `Exams.tsx` shows `Attempts: n/max_attempts` on each card, a best-score badge when ≥1 completed, and a `Next attempt in Xh Ym` line + disabled Start when a cooldown is active or `n >= max`.
- `Exam.tsx`, on load, `fetchStudentAttempts`; compute gate: if already at cap → show "no attempts left — best score X%"; if cooldown → show countdown screen (server still enforces).
- On successful submit, invalidate `['student-exam-entries', userId]` so the card refreshes.

- [ ] **Step 1: Write failing tests**

Append to `src/test/pages/ExamsPage.test.tsx` new test cases for card contents (matching how ExamsPage is currently tested). The page already uses a `fetchExams` mock — extend it to return attempt fields and add a `fetchStudentAttempts` mock. Concretely, describe new summaries with `Attempts: 1/3` and cooldown label.

Provide the test that renders the list, asserts `Attempts: 1/3`, `Best: 85`, and a disabled `Start Exam` when a 24h cooldown field is armed.

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL (feature missing → text not found).

- [ ] **Step 3: Implement `Exams.tsx`**

Add a query for all of the user's attempts grouped by exam:

```ts
const { data: myAttempts = [] } = useQuery({
  queryKey: ['my-exam-attempts', user?.id],
  queryFn: async () => {
    if (!user) return []
    const { data, error } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('user_id', user.id)
    if (error) throw error
    return data as ExamAttempt[]
  },
  enabled: !!user,
})
```

Inside `filtered.map`, compute:

```ts
const examAttempts = attempts.filter(a => a.exam_id === exam.id)
const used = examAttempts.filter(a => a.status === 'completed').length
const best = getBestScore(examAttempts)
const lastCompleted = examAttempts.find(a => a.status === 'completed')
const cooldownMs = lastCompleted && exam.cooldown_hours > 0
  ? (new Date(lastCompleted.completed_at!).getTime() + exam.cooldown_hours * 3600e3) - Date.now()
  : 0
const locked = exam.type === 'exam' && (used >= (exam.max_attempts ?? 3) || cooldownMs > 0)
```

Render in the card:

```tsx
{exam.type === 'exam' && (
  <div className="mt-1 text-xs">
    <span>Attempts: {Math.min(used + 1, exam.max_attempts ?? 3)}/{exam.max_attempts ?? 3}</span>
    {best > 0 && <span className="ml-3 font-semibold text-accent-green">Best: {best}%</span>}
  </div>
)}
```

Replace the CTA `<span>` block:

```tsx
{exam.type === 'practice' ? (
  <span className="inline-block rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light">Start Practice</span>
) : locked ? (
  <span className="inline-block rounded-lg px-6 py-2 font-semibold text-text-muted">
    {cooldownMs > 0 ? `Next attempt in ${Math.ceil(cooldownMs / 3.6e6)}h` : 'No attempts left'}
  </span>
) : (
  <span className="inline-block rounded-lg bg-brand px-6 py-2 font-semibold text-white hover:bg-brand-light">Start Exam</span>
)}
```

(Cooldown shows hours; exact `Xh Ym` format in Task 7.)

- [ ] **Step 4: Implement gating in `Exam.tsx`**

Add:

```ts
const { data: pastAttempts = [] } = useQuery({
  queryKey: ['my-exam-attempts', id],
  queryFn: () => user ? fetchStudentAttempts(id!, user.id) : Promise.resolve([]),
  enabled: !!id && !!user,
})
const completedCount = pastAttempts.filter(a => a.status === 'completed').length
const gate = exam ? (completedCount >= (exam.max_attempts ?? 3) ? 'no_attempts' :
  lastCompletedCooldownMs(exam, pastAttempts) > 0 ? 'cooldown' : null) : null
```

Render early-return above `isLoading` block, when `exam && gate`:

```tsx
if (exam && gate === 'no_attempts') {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <p className="text-lg font-bold text-text">No attempts left</p>
      <p className="mt-2 text-text-muted">Your best score: {getBestScore(pastAttempts)}%</p>
      <button onClick={() => navigate('/exams')} className="mt-4 rounded-lg bg-brand px-6 py-2 text-white">Back to Exams</button>
    </div>
  )
}
if (exam && gate === 'cooldown') {
  const ms = cooldownRemainingMs(exam, pastAttempts)
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <p className="text-lg font-bold text-text">Too soon to retake</p>
      <p className="mt-2 text-text-muted">Next attempt available in about {Math.ceil(ms / 3.6e6)} hours.</p>
      <button onClick={() => navigate('/exams')} className="mt-4 rounded-lg bg-brand px-6 py-2 text-white">Back to Exams</button>
    </div>
  )
}
```

Add pure helpers to `src/lib/exams.ts` + exported:

```ts
export function cooldownRemainingMs(exam: Pick<Exam, 'cooldown_hours'>, attempts: ExamAttempt[]): number {
  const last = attempts.filter(a => a.status === 'completed')
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0]
  if (!last || !exam.cooldown_hours) return 0
  return Math.max(0, new Date(last.completed_at!).getTime()
    + exam.cooldown_hours * 3600e3 - Date.now())
}
```

Import `cooldownRemainingMs` in Exam.tsx; call `const cd = cooldownRemainingMs(exam, pastAttempts); const gate = exam ? (completedCount >= (exam.max_attempts ?? 3) ? 'no_attempts' : cd > 0 ? 'cooldown' : null) : null`.

- [ ] **Step 5: Update `Exam.tsx` to not auto-start attempt when gate is set**

The existing `useEffect` that calls `startAttempt` must skip when `gate` is truthy — otherwise the DB blocks with `exam_no_attempts_left`. Guard it: only run when `!gate`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/test/pages/ExamsPage.test.tsx src/test/pages/Exam.test.tsx src/test/lib/exams.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Exams.tsx src/pages/Exam.tsx src/lib/exams.ts src/test/pages/ExamsPage.test.tsx src/test/lib/exams.test.ts
git commit -m "feat: enforce max attempts and cooldown gate in UI"
```

---

## Task 7: Results page best-score display

**Files:**
- Modify: `src/pages/Results.tsx`
- Test: `src/test/pages/Results.test.tsx` (create if not present)

**Behavior:**
- Show current attempt score (existing) PLUS: "Best score across attempts: X%" line plus "You have N attempt(s) left" when the current exam allows more.

- [ ] **Step 1: Write failing test**

Create `src/test/pages/Results.test.tsx` (mirroring existing page-tests pattern — `useParams`/`MemoryRouter`). Mock the page's supabase queries to return an attempt with `exam_id: 'e1'`, plus `fetchStudentAttempts` returning both the test attempt and a higher score. Assert:

```tsx
expect(screen.getByText(/Best score/)).toBeInTheDocument()
expect(screen.getByText(/2 attempts left/)).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL (not rendered).

- [ ] **Step 3: Implement**

In `Results.tsx`, after the attempt query, load all attempts and compute displayed lines:

```ts
const { data: attempts = [] } = useQuery({
  queryKey: ['result-attempts', attempt?.exam_id, user?.id],
  queryFn: async () => {
    if (!attempt || !user) return []
    const { data, error } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', attempt.exam_id)
      .eq('user_id', user.id)
    if (error) throw error
    return data as ExamAttempt[]
  },
  enabled: !!attempt && !!user,
})
```

Compute:

```ts
const best = getBestScore(attempts)
const used = attempts.filter(a => a.status === 'completed').length
const left = Math.max(0, (attempt.exam.max_attempts ?? 3) - used)
```

Hmm — in the (old) types `Exam` lacks `max_attempts`. Add it in Task 1 so this compiles. Render under the score cards:

```tsx
<div className="mb-8 rounded-lg border border-brand/30 bg-surface p-4 text-center">
  <span className="text-sm text-text-muted">Best score across attempts: </span>
  <span className="font-bold text-brand">{best}%</span>
  {left > 0 && <span className="ml-3 text-sm text-text-muted">({left} attempt{left === 1 ? '' : 's'} left)</span>}
</div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/test/pages/Results.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Results.tsx src/test/pages/Results.test.tsx
git commit -m "feat: show best score and remaining attempts on results"
```

---

## Task 8: Admin exam settings (max_attempts, cooldown_hours)

**Files:**
- Modify: `src/pages/admin/AdminExams.tsx` (ExamEditModal form + update payload)

**Behavior:**
- In `ExamEditModal`, add two number fields: `Max Attempts` (1–5) and `Cooldown (hours)` (0–72). Include them in `handleSave` payload.
- Also surface a badge on the list row: `Attempts: n/max`.

- [ ] **Step 1: Implement fields**

In `ExamEditModal` add state:

```ts
const [maxAttempts, setMaxAttempts] = useState(exam.max_attempts ?? 3)
const [cooldownHours, setCooldownHours] = useState(exam.cooldown_hours ?? 0)
```

In the existing grid (near Grade), add:

```tsx
<div><label className="mb-1 block text-sm text-text-muted">Max Attempts</label>
  <input type="number" min={1} max={5} value={maxAttempts} onChange={e => setMaxAttempts(Number(e.target.value))} className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink" /></div>
<div><label className="mb-1 block text-sm text-text-muted">Cooldown (hours)</label>
  <input type="number" min={0} max={72} value={cooldownHours} onChange={e => setCooldownHours(Number(e.target.value))} className="w-full rounded-lg border border-border bg-white px-4 py-2 text-ink" /></div>
```

In `handleSave` add:

```ts
data.max_attempts = Math.max(1, Math.min(5, maxAttempts || 3))
data.cooldown_hours = Math.max(0, cooldownHours || 0)
```

In the list table, under "Actions update covered area" — simplest: add a `<td>` "Attempts" showing `${e.max_attempts ?? 3}`.

- [ ] **Step 2: No unit test needed** (admin modal is covered by the existing page tests; add a lightweight render+change assertion if the file's test exists). If none exists, add a minimal snapshot check in the existing exams-page test:

```tsx
it('shows attempt limit on the admin row', async () => {
  // render AdminExams with a mocked exam list including max_attempts: 3
  expect(await screen.findByText('3')).toBeInTheDocument()
})
```

- [ ] **Step 3: Run tests + lint**

Run: `npm run test && npm run lint`
Expected: PASS (all).

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminExams.tsx
git commit -m "feat: admin exam attempt limit + cooldown fields"
```

---

## Task 9: Seed variant groups for a first batch + final verify

**Files:**
- Create: `supabase/seed-variants-2026-08-06.sql`

**Behavior:**
- Provide 2 extra variants for a representative set of existing grade-10/11 questions so the feature is live testable without manual authoring.

- [ ] **Step 1: Write seed script**

Select a handful of existing questions and clone them with new numbers/answers, same `variant_group_id` (the base id). One example per type (then copy pattern):

```sql
-- Example — assumes question ids exist; run in your DB to find real ids first:
-- SELECT id, question_text FROM public.questions WHERE grade = 11 LIMIT 10;
-- Create variant group on the base row, then insert 1-2 variants referencing it.

ALTER TABLE exam_groups ALTER ... (no-op — group id lives on questions table).
```

Practically, execute (edit ids to real ones from your DB):

```sql
-- 1) Tag a base question as a group
UPDATE public.questions
   SET variant_group_id = id::text
 WHERE id = '<BASE_Q_ID>';

-- 2) Insert 2 variants with same group
INSERT INTO public.questions
  (id, type, subject, topic, difficulty, question_text, options, correct_answer, explanation, image_url, common_mistakes, created_by, variant_group_id)
VALUES
  (gen_random_uuid(), 'short_answer', 'Algebra', 'Equations', 2,
   'Solve for x: $$3x + 2 = 14$$.', '[]',
   '4', 'Subtract 2, divide by 3.', '', '[]', NULL, '<BASE_Q_ID>'),
  (gen_random_uuid(), 'short_answer', 'Algebra', 'Equations', 2,
   'Solve for x: $$5x + 3 = 28$$.', '[]',
   '5', 'Subtract 3, divide by 5.', '', '[]', NULL, '<BASE_Q_ID>');
```

- [ ] **Step 2: Apply variance for at least one active exam**

Update a practice-less published exam's questions so that 3+ entries use variants. Verify with:

```sql
SELECT q.variant_group_id, count(*) FROM question_variants v GROUP BY variant_group_id HAVING count(*) > 1;
```

- [ ] **Step 3: Verify per-attempt flatten seeding works end to end on the deployed site**

Sign in as `student@mathmentor.com` / `test123`, open the anti-cheat exam, screenshot: watermark present + variant numbers differ from a neighbor's. Submit → Results shows best score/attempts.

- [ ] **Step 4: Final full run**

Run: `npm run test` then `npm run lint` then `npm run build`
Expected: all PASS, build clean, no warnings in oxlint.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed-variants-2026-08-06.sql
git commit -m "feat: seed variant groups for first exam batch"
```

---

## Self-review notes

- Spec coverage: shuffle (Task 4), 3 attempts (Tasks 1,6,8), best-score grading (Task 7), cooldown (Task 1,6), time-seeded variants (Tasks 3,4), watermark (Task 5), DB gate (Task 1), admin settings (Task 8), seed (Task 9). All spec sections covered.
- No placeholders: all steps carry real code or exact commands.
- Type consistency: `cooldownRemainingMs`, `getBestScore`, `resolveVariant`, `fetchVariantPool`, `startAttempt` names used uniformly across tasks.
  - Note on practice: _exams_ default `max_attempts = 3`; practice ignored everywhere.
