# Year-1 LMS Overhaul — Design Spec

**Date**: 2026-08-26 · **Repo**: math-mentor-lms (canonical clone: `C:\Users\moaz7\OneDrive\Documents\math-mentor-lms`) · **Status**: approved direction, pending final user review

---

## 1. Goals

1. Rebrand the live app to The Math Mentor House v2 (fix "doesn't look like our brand").
2. Rebuild the Teacher Dashboard into a real command center (fix "too weak").
3. Complete the exam/practice anti-cheat behavior (parameterized numbers, practice variants).
4. Smooth the content pipeline: curriculum PDFs → vault → Supabase → live exam, so "teacher directs → exam published" is fast.
5. Everything verified working before it ships (`npm run verify` + smoke checklist per phase).

## 2. Non-goals (year 1)

- No online payments in the app (teacher handles money outside; Stripe absent from this repo anyway).
- No Arabic anywhere — English-only UI, exams, sheets (overrides SYSTEM_SPEC §bilingual sections).
- No session booking, no course store, no LTI/OneRoster integrations.
- No full frontend rewrite.

## 3. Constraints & context

- ~500 students now, may reach 1000–2000. Supabase Postgres is fine at this scale.
- Students are on phones; PWA already exists.
- Product/skeleton may be sold later → only license-safe materials; copyrighted Egyptian Ministry PDFs and books are analyzed for scope but questions are always rewritten in original words. Open-licensed sources (Illustrative Mathematics CC BY, Numbas library Apache, etc.) usable with attribution.
- Grade scope year 1: **Grades 4–10** (grade accent colors for all of them already exist in SYSTEM_SPEC §2.4 / DESIGN.md §2.2). Grade 10 content ships first (curriculum JSON + vault questions ready); grades 4–9 follow the same pattern as owner directs content.
- Safety rule from owner: backups before risky changes; every phase on its own branch, merged only when green. Copy A WIP already preserved on branch `backup/wip-exam-anti-cheat`.

## 4. Current state (audited)

Working: auth (Google OAuth + email/password + reset), PWA, Practice/Exams/Results/WeakPoints/Bookmarks pages, seeded shuffle (questions + choices), `useAntiCheat` (tab-switch/fullscreen violations, 3-strike auto-submit, persisted), `/admin/violations`, attempt RPC with seed + attempt_number + cooldown, Telegram report workflows (GitHub Actions), daily Supabase keep-alive/backup, KaTeX rendering.

Gaps: TeacherDashboard is one 64-line file (3 KPI cards + exam list); brand tokens are wrong palette (#112A43/Montserrat vs House v2 teal/Lexend+Playfair); variant pools plumbed (`variant_group_id`) but practice flow incomplete; **no parameterized question templates** (numbers fixed inside question text); question bank import exists as script but no UI.

## 5. Design

### 5.1 Rebrand (Phase 1)
Keep semantic class names (`bg-brand`, `text-accent-green`, …) and change token VALUES in `src/index.css` `@theme`:
- `--color-brand`: #0A9396 (tmm-teal) · dark #0A6F72
- `--color-accent-green`: #84A98C (sage) · `--color-accent-gold`: #D4A373
- add terra #E76F51 (danger stays), cyan #01CBFC accents
- bg/paper: #FAF9F6 family (already close)
- fonts: Lexend (body/UI) + Playfair Display (display headings), via Google Fonts import swap
Then grep-sweep hardcoded legacy hexes (#00784A, #E8BB1A, #112A43) in components. Visual QA against DESIGN.md component rules (buttons/cards/inputs).

### 5.2 shadcn/ui adoption (Phase 2)
`shadcn init` into the Vite app (Radix-compatible; project already uses Radix). Add incrementally: button, card, table, tabs, dialog, badge, dropdown-menu, sonner/toast, chart. Theme wired to existing CSS variables so shadcn components inherit House v2 automatically.

### 5.3 Teacher Dashboard rebuild (Phases 3–6)
Sidebar layout modeled on shadcn-admin patterns. Views, all via TanStack Query against existing Supabase tables:

| View | Content |
|---|---|
| Overview | KPI cards: active students (7d), attempts this week, average score, flagged violations count; score-distribution chart (Recharts via shadcn chart); recent submissions table (student, exam, score, time) |
| Students | TanStack Table: search by name, grade filter, last-active, avg score; row click → student drill-in (mastery squares reuse, per-topic weak points, attempt history) |
| Exams | list with publish/draft toggle; create-from-bank (pick topic/grade/count from imported questions); per-exam results table incl. violation counts; "re-send Telegram report" action |
| Question Bank | browse imported questions (filter topic/grade/difficulty/type); import endpoint for vault JSON emitted by Default Project pipeline |

No payments view (dropped per owner). No DB migration required for dashboard work.

### 5.4 Exam & practice behavior (Phase 7)
Already built — keep and test: shuffle order/choices, violations + timer, cooldown/best-score.
To complete:
1. **Parameterized templates**: question text may contain `{var}` placeholders + a `params` spec (ranges/expressions) stored per question — **one nullable `jsonb` column `questions.params`, the only planned DB migration this year**; attempt seed (already issued by `start_exam_attempt` RPC, time-derived) fills values deterministically. Renderer substitutes before KaTeX; correct_answer stored as expression evaluated over params. Generator support added in Default Project `math_builder.py` so authored vault questions can ship templates.
2. **Exam mode**: single scored attempt enforced (existing attempt rules); after submit → review screen shows each mistake + explanation + common_mistakes; no re-attempt while window open.
3. **Practice mode**: wrong answer → show worked solution (explanation field) → if question has `variant_group_id` and template params → serve next variant with new numbers (from same seeded pool); non-template questions just move on. Mastery squares update per skill.

### 5.5 Content engine workflow (Phase 8)
Owner says topic/week → pipeline: analyze curriculum PDF/book section → draft original questions (LaTeX) → vault MD w/ frontmatter → `math_builder.py` → sheet.typ→PDF + exam.react.json → bank import script → Supabase → publish exam. Tuning goal: minimize manual steps between vault JSON and live exam (single npm command target).

### 5.6 Verification gates ("make sure it really works")
- Phase branch → `npm run typecheck && lint && test && build` green → merge → Cloudflare Pages preview checked → then production deploy.
- Per-phase smoke checklists (explicit click-paths below in plan).
- Final E2E: login → exam (violations simulated, timer, submit once) → mistakes review → practice variant appears → teacher sees score + violations → Telegram workflow trigger logged.
- Rollback: git revert + Pages redeploy previous build; Supabase daily backup already active; migration-less phases keep DB risk near zero.

## 6. Testing strategy
Vitest units for new hooks/lib (param substitution evaluator, seeded RNG determinism, variant selection); component tests for dashboard views (mocked supabase, matching existing test style in src/test); update existing Exam/Practice page tests; manual smoke per phase. No flaky timers — fake timers in tests.

## 7. Risks
- Token rename misses hardcoded hexes → mitigated by grep sweep + visual QA pass.
- Param evaluator security (never eval raw input; restricted expression parser or precomputed safe functions).
- Seeded determinism across devices (seed stored server-side per attempt, client renders from it — already the pattern).
- Scope creep on content generation → year 1 = Grade 10 only until owner redirects.

## 8. Lessons from past problems (do not repeat)

Learned from repo history, HANDOFF.md §10 gotchas, and prior fixes:

1. **Brand drift happened 3×** (2024 blue → artwork teal/gold → House v2). Root cause: stale docs teaching old palettes. Rule: Phase 1 REWRITES `docs/brand-governance.md` to House v2 + Lexend/Playfair; never hardcode hex in components; single `@theme` source.
2. **Spurious sign-outs** were fixed before (E2E-verified auth). Do not touch session/token handling in useAuth or Supabase client while rebranding/rebuilding layout; keep auth tests green.
3. **Telegram workflow broke once** (fixed de315da) and **GitHub Actions had over-broad permissions** (fixed 6f55e33 → contents:read). When touching exam/report features, run the workflow dry-run path; don't widen workflow permissions.
4. **Perf regressions**: offline mode + build splitting were hard-won (24b239c). Keep JS chunk budget; new shadcn/dashboard code must be code-split (lazy teacher routes already exist — follow that pattern).
5. **Default Project build traps** (HANDOFF §10): Typst table cells must be content blocks `[...]` never strings; `;` after `]` gets dropped; PowerShell `.Replace("\n")` fails on CRLF — edit via tools, not string replace; LaTeX `\&` always escaped; missing figure SVG = compile fail (check frontmatter paths); root tsconfig has no jsx (use per-workspace typecheck); `npm run verify` is the only "done" proof.
6. **Anti-cheat spec patterns are canonical** (docs/superpowers/specs/2026-08-06): variant selection is deterministic and server-independent, shuffle per attempt, SECURITY DEFINER RPC. Param templates (§5.4) must extend these mechanisms, not invent parallel ones.
7. **152 passing tests existed** at baseline; any phase that turns tests red without fixing them is not done.

## 9. Open items
- Owner to supply Grade 10 curriculum PDFs/books not already in `raw_pdfs/`.
- Confirm whether `start_exam_attempt` seed is truly time-derived in current SQL (verify in Supabase during Phase 7).
