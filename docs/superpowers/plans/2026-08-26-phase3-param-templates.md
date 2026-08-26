# Phase 3 — Parameterized Question Templates + Practice Variant Loop

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Checkboxes track progress.

**Goal:** Questions authored as templates (`{a}+{b}=` with `params` spec) get consistent, seeded numbers per attempt — fixing naive-jitter answer-key drift — and practice mode gains "try new numbers" after a wrong answer.

**Architecture:** Pure param engine in `src/lib/params.ts` (seeded PRNG reuse of mulberry32 pattern from shuffle.ts; NO eval — tiny recursive-descent expression parser). One nullable JSONB column `questions.params`. Exam.tsx swaps `jitterQuestion`→`applyTemplate` (fallback keeps old behavior for non-template questions). Practice.tsx adds retry-with-new-seed when wrong.

**Tech:** TypeScript strict, Vitest, Supabase SQL migration (applied by owner in dashboard).

## Global Constraints

- No eval()/Function constructor (security rule).
- Deterministic: same seed ⇒ same numbers everywhere.
- House v2 UI only; English-only strings; no auth changes.
- Branch `feat/phase3-param-templates`; gates green before merge.

---

### Task 1: Migration file (owner applies manually)

**Files:** Create `supabase/migration-006-question-params.sql`

- [ ] Step 1: content

```sql
-- migration-006: parameterized question templates
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS params JSONB;

COMMENT ON COLUMN public.questions.params IS 'Optional template spec, e.g. {"a":{"min":2,"max":9},"b":{"min":1,"max":5}}. When present, {var} tokens in question_text/options/correct_answer are substituted with seeded values.';

-- RLS unchanged (column inherits table policies).
-- Rollback: ALTER TABLE public.questions DROP COLUMN IF EXISTS params;
```

- [ ] Step 2: commit `chore(db): migration 006 adds questions.params jsonb`. Tell owner: Supabase Dashboard → SQL Editor → run file (no CLI creds on this machine).

### Task 2: Param engine `src/lib/params.ts` (+ types touch)

**Files:** Create `src/lib/params.ts`; Modify `src/types/index.ts` (add `params?: Record<string, {min:number;max:number} | undefined> | null` to Question)

**Interfaces (produced):**
- `resolveParams(spec: Record<string,{min:number;max:number}>, seed: string): Record<string,number>`
- `substitute(text: string, params: Record<string,number>): string`
- `evaluateExpression(expr: string, params: Record<string,number>): number` // supports ints, decimals, {var}, + - * / ( ), unary minus; throws on anything else
- `applyTemplate<T extends {question_text:string;options:string[];correct_answer:string;type:string;params?:Record<string,{min:number;max:number}>|null}>(q: T, seed: string): T` // substitutes text+options; for short_answer evaluates correct_answer expr; MCQ correct stays index; falls back to jitterQuestion when params empty

- [ ] Step 1: failing tests `src/test/lib/params.test.ts`: determinism (same seed twice identical), different seeds differ (statistically: at least one var differs over 5 seeds), substitution replaces all `{x}` occurrences incl. inside `$...$`, evaluateExpression cases: `"2+3*4"→14`, `"{a}*{b}"`, `"(10-{a})/2"` with odd a → rounds to 4dp trimmed, unary minus `"-{a}+5"`, rejects letters/`eval`-like input, division by zero → throws. applyTemplate: template short_answer gets evaluated numeric correct_answer matching substituted text math; non-template question routes to jitterQuestion (spy).
- [ ] Step 2: implement params.ts (recursive-descent: parseExpr→parseTerm→parseFactor; factor handles number | {var} | (expr) | -factor). Reuse hashString/mulberry32 — export mulberry32 from shuffle.ts (modify: add `export`) instead of duplicating.
- [ ] Step 3: green + build; commit `feat(params): seeded template engine with safe expression evaluation`

### Task 3: Exam.tsx integration

**Files:** Modify `src/pages/Exam.tsx` (~lines 130–150)

- [ ] Step 1: replace `jitterQuestion(...)` call with `applyTemplate(question as any, fullSeed + question.id)` (import from lib/params). Keep subsequent option-shuffle ordering logic untouched (shuffle still uses resolved options).
- [ ] Step 2: typecheck + full suite green; manual smoke: take any exam — non-template questions behave as before (jitter path).
- [ ] Step 3: commit `feat(exam): route questions through param templates`

### Task 4: Practice retry-with-new-numbers

**Files:** Modify `src/pages/Practice.tsx`; Test extend `src/test/pages/PracticePage.test.tsx`

- [ ] Step 1: read Practice.tsx fully first; locate post-answer state machine (explanation display exists ~line 201).
- [ ] Step 2: when answered WRONG and current question has `params` OR belongs to a `variant_group_id` pool → render button "Try new numbers". Handler: increment local retry counter, derive `seed + '_retry' + n`, re-derive question via applyTemplate/resolveVariant, reset selected answer, keep score untouched (retry not scored). Non-retryable wrongs → plain next-question button (existing behavior preserved).
- [ ] Step 3: failing-first test: mock question WITH params; simulate wrong answer; assert button appears and clicking changes rendered numbers (different seed ⇒ different substituted text) without increasing score.
- [ ] Step 4: green + build; commit `feat(practice): retry with new numbers for template questions`

### Task 5: Ship + verify

- [ ] Gates: lint/test/build all green (expect ≥240 tests)
- [ ] Merge branch → push main → CF deploy → live check bundle
- [ ] Manual QA checklist for owner: create one template question via Admin→Questions (paste params JSON `{"a":{"min":2,"max":9}}`, text `Compute ${a}+{a}` … wait—use `{a}+{a}`), publish exam, open exam twice (different attempts): numbers differ AND displayed sum matches typed-answer grading; practice wrong-answer retry works.
- [ ] Update spec checkboxes + memory progress.

## Self-review

- Spec §5.4 fully covered (templates ✓ single-attempt already ✓ review already ✓ practice loop ✓).
- Security: no eval — hand parser only.
- Consistency fix rationale documented: template answers derived from SAME resolved params as text.
