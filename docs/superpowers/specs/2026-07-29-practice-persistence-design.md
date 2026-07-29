# Practice Persistence — Design Spec

## Goal
Save practice attempt answers to the database in real-time (per-answer write), replacing the current in-memory-only flow.

## Approach
Each answer is upserted into the `answers` table on selection. Practice sessions create an `exam_attempts` row on start and mark it completed on finish.

## Data Flow
1. User clicks "Start Practice" on an exam with `type: practice`
2. `CREATE exam_attempts` → status `in_progress`
3. Per answer selection → `UPSERT answers` (insert if new, update if re-selected)
4. "Finish Practice" → `UPDATE exam_attempts` → status `completed`, calculate score
5. Redirect to `/results/:attemptId`

## DB Impact
No schema changes. Uses existing `exam_attempts` + `answers` tables.

## Files Changed
| File | Change |
|------|--------|
| `src/lib/practice.ts` | New — `startPractice`, `submitAnswer`, `finishPractice`, `getPracticeHistory` |
| `src/pages/Practice.tsx` | Rewrite — replace in-memory state with DB calls via TanStack Query mutations |
| `src/pages/Dashboard.tsx` | Add practice stats section alongside exam stats |
| `src/hooks/usePractice.ts` | New — custom hook wrapping practice data + mutations |

## Design Decisions
- **Instant per-answer save**: Best UX for students (no loss on crash/refresh)
- **Upsert not insert**: Handles re-selection cleanly with a single PK on `(attempt_id, question_id)`
- **Reuses `/results/:attemptId` route**: No new results page needed — practice results render the same review UI
- **`usePractice` hook**: Encapsulates mutations + queries, keeps Practice.tsx focused on rendering

## Testing
- `src/test/lib/practice.test.ts` — Unit test all 4 practice data functions
- `src/test/pages/PracticePage.test.tsx` — Integration test: start practice, answer questions, finish, redirect
- Mock the same Supabase query builder pattern used in existing lib tests
