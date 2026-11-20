# Design System — The Math Mentor LMS (House v2 × Stitch)

> **Canonical Brand Reference:** `SYSTEM_SPEC.md §2` + `docs/brand-governance.md`
> **Tokens:** `src/index.css` `@theme` (Tailwind v4)
> **Rule:** Never invent arbitrary hex colors (`bg-[#...]`) or reintroduce the retired 2024 blue (`#1982C4`) / Montserrat palette.

## 1. Visual Atmosphere
Warm, focused, editorial math studio — **60% warm paper (`#FAF9F6`) & crisp surface (`#FFFFFF`)**, **30% structural teal/navy/ink (`#0A9396`, `#1A1A2E`, `#222C31`)**, **10% purposeful accents (`#D4A373` gold, `#84A98C` sage, `#E76F51` terracotta)**. Math content, diagrams, and equations are the hero; chrome recedes.

## 2. Core Palette (House v2)
- **Brand Teal (`--color-brand`):** `#0A9396` — Primary CTAs, active tabs, links, progress highlights
- **Brand Teal Dark (`--color-brand-light`):** `#0A6F72` — Hover states, high-contrast teal text on light surfaces
- **Brand Navy (`--color-brand-dark`):** `#1A1A2E` — Dark callouts, closing cards, secondary headers
- **Sage (`--color-accent-green` / `--color-success`):** `#84A98C` — Mastery, correct steps, practice workspaces
- **Gold (`--color-accent-gold` / `--color-warning`):** `#D4A373` — Key rules, effort badges, gentle warnings
- **Terracotta (`--color-danger`):** `#E76F51` — Common mistakes, errors (warm, non-punitive vs harsh neon red)
- **Paper (`--color-bg` / `--color-paper`):** `#FAF9F5` / `#FAF9F6` (Light) · `#14161F` (Dark Night)
- **Ink (`--color-ink`):** `#222C31` (Light) · `#EDEEF2` (Dark Night) — Never pure `#000000`

## 3. Grade-Adaptive Accents & Visual Rhythm (Grades 1–12)
- **Primary Tier (Grades 1–6):** Larger comfortable reading size (`17px`), generous touch targets (`≥48px`), softer radii (`rounded-2xl`), warm grade accents (`G1 #E76F51`, `G2 #E07A5F`, `G3 #D97706`, `G4 #E76F51`, `G5 #CF7B1D`, `G6 #B33A63`).
- **Middle / Prep Tier (Grades 7–9):** Balanced editorial spacing, cool academic accents (`G7 #2980B9`, `G8 #8E44AD`, `G9 #6C3483`).
- **Secondary / High Tier (Grades 10–12):** Crisp, focused exam-prep density (`G10 #0A9396`, `G11 #1A1A2E`, `G12 #0A6F72`).

## 4. Typography
- **Display / Headings (`--font-display`):** `Playfair Display` (brand moments, hero titles, celebration headers)
- **Body / UI (`--font-body`):** `Lexend` (all UI controls, questions, dashboards — high legibility, minimum 10.5pt)
- **Arabic RTL (`[lang="ar"]`, `[dir="rtl"]`):** `Cairo`, `Lexend`, sans-serif (crisp Arabic legal & bilingual UX)
- **Math:** KaTeX + MathLive WYSIWYG field (never raw LaTeX exposed to students)

## 5. Stitch Anti-Slop & Accessibility Rules
- **Icons:** `lucide-react` stroke-consistent icons for UI badges & chrome (avoid noisy emoji clutter).
- **Motion:** Compositor-only (`transform`, `opacity`), 150–250ms `ease-out`, opt-in via `@media (prefers-reduced-motion: no-preference)`. No neon outer glows, no infinite bounce, no flashing (`< 3/sec`), always include a dismiss control on celebration banners.
- **No Profiling:** All gamification (streaks, effort badges, perfect-score celebrations) is strictly **opt-in**, stored locally per student/parent choice, and never used for grading or behavioral profiling.
- **Slogans:** *"The Lesson Counts."* (footer signature) · *"Learn It. Do It. Own It."* (mastery & perfect-score moments).
