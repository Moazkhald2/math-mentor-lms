# Taste Skill Audit — math-mentor-lms (2026-08-22)

## 0. Design Read
**Reading as: LMS education platform for K-12 students + teachers, trust-first / accessible language, leaning toward Tailwind v4 + Radix + Motion with custom tokens**

Dials inferred: **VARIANCE 3 / MOTION 3 / DENSITY 4** (trust-first = low variance, low motion, balanced density). Override: keep brand navy #112A43, lock one accent.

## 1. Audit (redesign-skill checklist)

**Typography**
- ✅ Montserrat distinctive (not Inter), good. Fix: add `font-display: swap`, limit body to `max-w-[65ch] leading-relaxed`, use 500/600 weights for hierarchy, `text-wrap: balance` on headlines.
- ⚠️ `lucide-react` is taste-banned default — migrate to `@phosphor-icons/react` (one family, strokeWidth 1.5).

**Color**
- ❌ Two accents: `--color-accent-green #00784A` + `--color-accent-gold #E8BB1A` >1 accent. Pick **one** (green for success/brand), demote gold to warning-only.
- ⚠️ Warm/cool grays mixed? Tokens use slate (f8fafc/e2e8f0) consistent — keep locked.

**Layout**
- ✅ `max-w-6xl` container, `min-h-screen` (not h-screen), Grid over flex-math — passes.
- ⚠️ `Layout.tsx:25` `shadow-[inset_0_-2px_0_theme(...)]` tinted shadow good, but header height not capped (should be 64-72px).
- ⚠️ `QuestionCard:14` `card border` generic — fine for LMS but consider `border-t` grouping when density >7.
- ✅ Mobile hamburger explicit, single-line nav desktop — passes.

**Interactivity**
- ❌ No hover/active states on `QuestionCard` option divs, no `active:scale-[0.98]`, no focus rings.
- ❌ No loading skeleton (currently null), no empty state illustration.

**Content**
- ⚠️ Emojis ✗/✓ in QuestionCard:79,82 — replace with Phosphor icons per policy.

## 2. Priority Fixes (taste v2 pre-flight)

1. **Lock palette** — keep green, remove gold from `@theme` accent, keep only for warning token `src/index.css:22`
2. **Font swap + typography** — add `text-wrap: balance`, `tracking-tighter` for display, `font-variant-numeric: tabular-nums` for scores
3. **Icon migration** — `npm i @phosphor-icons/react` + replace lucide imports
4. **Motion** — add `motion/react` entry reveal `whileInView` for cards, `prefers-reduced-motion` fallback
5. **Card polish** — add `hover:translate-y-[-1px] transition-all duration-200`

## 3. Next
- Run `npm i @phosphor-icons/react motion` then apply fixes in `src/index.css` + `src/components/QuestionCard.tsx` + `Layout.tsx`
- Verify in light/dark, run `npm run build && npm test`
