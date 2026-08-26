# Rebrand to House v2 Implementation Plan (Phase 1 of Year-1 Overhaul)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand math-mentor-lms to The Math Mentor House v2 (teal/navy/gold/terra/sage + Lexend/Playfair) by swapping `@theme` values in place, so every screen rebrands without touching components.

**Architecture:** Keep all existing semantic class names (`bg-brand`, `text-accent-green`, …) and change only their VALUES in `src/index.css` `@theme` plus fallbacks in `src/styles/css/globals.css`. Fonts swap via one Google Fonts import. Governance docs updated to stop future brand drift.

**Tech Stack:** Tailwind CSS v4 (`@theme`), React 19 + Vite 8, Vitest.

## Global Constraints

- Canonical hex values ONLY from `DESIGN.md §2.1` / `SYSTEM_SPEC.md §2.2` — never invent hex values.
- English-only UI (no Arabic strings introduced).
- No changes to auth/session code (spurious sign-out regression risk).
- Branch-per-phase: all work on `feat/rebrand-house-v2`, never commit directly to `main`.
- Gate before done: `npm run typecheck && npm run lint && npm run test && npm run build` green (repo scripts; verify via `npm run build` minimum if others absent at root — check package.json first).

---

### Task 1: Branch + baseline

**Files:** none created (git only)

- [ ] **Step 1: Create feature branch**

```bash
cd "C:\Users\moaz7\OneDrive\Documents\math-mentor-lms"
git checkout main
git pull origin main
git checkout -b feat/rebrand-house-v2
```

Expected: `Switched to a new branch 'feat/rebrand-house-v2'`

- [ ] **Step 2: Baseline build must be green**

```bash
npm install
npm run build
```

Expected: exit 0. If red, STOP and fix baseline first — rebrand never starts from a broken tree.

### Task 2: Swap fonts + core tokens in `src/index.css`

**Files:**
- Modify: `src/index.css` (lines 1, 10–11, 13–15, 21–22, 25–26, 51)

**Interfaces:**
- Produces: CSS vars consumed app-wide — `--color-brand`, `--color-brand-light`, `--color-brand-dark`, `--color-accent-green`, `--color-accent-gold`, `--color-success`, `--color-warning`, `--font-body`, `--font-display`. Names unchanged; values change.

- [ ] **Step 1: Replace the Google Fonts import (line 1)**

```css
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap');
```

- [ ] **Step 2: Replace font token (line 10) — rename montserrat → body/display**

Old:
```css
  --font-montserrat: 'Montserrat', sans-serif;
```
New:
```css
  --font-display: 'Playfair Display', 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body: 'Lexend', 'Inter', system-ui, sans-serif;
```

- [ ] **Step 3: Replace brand token values (lines 13–15)**

Old:
```css
  --color-brand: #112A43;
  --color-brand-light: #1F4A73;
  --color-brand-dark: #0D1F33;
```
New:
```css
  --color-brand: #0A9396;        /* tmm-teal */
  --color-brand-light: #0A6F72;  /* tmm-teal-dark — used as accent TEXT/border on light bg */
  --color-brand-dark: #1A1A2E;   /* tmm-navy — darkest state */
```

Note: `brand-light` is used 40× as visible accent text/borders/backgrounds; the pale tint `#E6F5F5` would be invisible as text, so teal-dark is the correct mapping. Visual QA in Task 6 must check every `bg-brand-light` surface for contrast.

- [ ] **Step 4: Replace accents (lines 21–22, 25–26)**

Old:
```css
  --color-accent-green: #00784A;
  --color-accent-gold: #E8BB1A;
```
New:
```css
  --color-accent-green: #84A98C; /* tmm-sage */
  --color-accent-gold: #D4A373;  /* tmm-gold */
```

Old:
```css
  --color-success: #00784A;
  --color-warning: #E8BB1A;
```
New:
```css
  --color-success: #84A98C;      /* tmm-sage */
  --color-warning: #D4A373;      /* tmm-gold */
```

- [ ] **Step 5: Update body font-family (line 51)**

Old:
```css
  font-family: var(--font-montserrat);
```
New:
```css
  font-family: var(--font-body);
```

- [ ] **Step 6: Verify dev server renders**

```bash
npm run dev
```
Open http://localhost:5173 — expect teal header/buttons, Lexend text. Leave running for Task 6 QA.

### Task 3: Fix fallbacks + font refs in `src/styles/css/*`

**Files:**
- Modify: `src/styles/css/globals.css` (lines 7–8, 13–21)
- Modify: `src/index.html` (line 8)

**Interfaces:**
- Consumes: Task 2 vars. globals.css aliases must point at new values so legacy fallback hexes disappear.

- [ ] **Step 1: globals.css font stacks**

Old:
```css
  --font-body: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-heading: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```
New:
```css
  --font-body: 'Lexend', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-heading: 'Playfair Display', 'Plus Jakarta Sans', system-ui, sans-serif;
```

- [ ] **Step 2: globals.css alias fallbacks**

Old:
```css
  --brand-primary: var(--color-brand, #112A43);
  --brand-secondary: var(--color-brand-light, #1F4A73);
  --brand-accent: var(--color-accent-gold, #E8BB1A);
```
New:
```css
  --brand-primary: var(--color-brand, #0A9396);
  --brand-secondary: var(--color-brand-light, #0A6F72);
  --brand-accent: var(--color-accent-gold, #D4A373);
```

And:
```css
  --success: var(--color-success, #84A98C);
  --accent-green: var(--color-accent-green, #84A98C);
  --warning: var(--color-warning, #D4A373);
  --accent-gold: var(--color-accent-gold, #D4A373);
```

- [ ] **Step 3: PWA theme-color**

Old:
```html
    <meta name="theme-color" content="#112A43" />
```
New:
```html
    <meta name="theme-color" content="#0A9396" />
```

### Task 4: Zero legacy-hex sweep (verification gate)

- [ ] **Step 1: Grep proves no old palette remains**

```bash
rg -n -i "#112A43|#1F4A73|#0D1F33|#00784A|#E8BB1A|Montserrat" src index.html
```
Expected: **no matches**. If matches appear in files this plan didn't list, apply the same value-mapping (blue→teal family, gold→#D4A373) and re-grep.

- [ ] **Step 2: Commit CSS rebrand**

```bash
git add src/index.css src/styles/ index.html
git commit -m "feat(brand): swap design tokens + fonts to House v2 (SYSTEM_SPEC §2.2)"
```

### Task 5: Rewrite `docs/brand-governance.md` (stop future drift)

**Files:**
- Modify: `docs/brand-governance.md` (full rewrite)

- [ ] **Step 1: Replace entire file content**

```markdown
# Math Mentor — Brand Governance (House v2, canonical)

> Source of truth: `SYSTEM_SPEC.md §2.2` + `DESIGN.md §2`. The 2024 blue palette
> (#1982C4/Montserrat era) is OBSOLETE. Never reintroduce it.

## Logo System

| Variant | File | Usage |
|---------|------|-------|
| Primary | `/public/logo-main.png` | Navbar, landing page |
| Symbol | `/public/logo-symbol.png` | Favicon, mobile, tight spaces |

Rules: no stretch/distortion · clear space = logo height · no recolor/effects ·
no low-contrast backgrounds.

## Colors (House v2 — defined once in `src/index.css` @theme)

| Token | Value | Role |
|-------|-------|------|
| `brand` | `#0A9396` | primary buttons, links, header accents (tmm-teal) |
| `brand-light` | `#0A6F72` | accent text/borders/hover on light surfaces (tmm-teal-dark) |
| `brand-dark` | `#1A1A2E` | dark callouts, closing sections (tmm-navy) |
| `accent-green` / `success` | `#84A98C` | success (tmm-sage) |
| `accent-gold` / `warning` | `#D4A373` | achievements, warnings (tmm-gold) |
| danger | `#E76F51` | errors, common-mistakes (tmm-terra) |
| ink | `#2D3436` · muted `#636E72` · paper `#FAF9F6` | text hierarchy |

Never hardcode hex in components. Grade accents G4–G11: see DESIGN.md §2.2.

## Typography

| Token | Font | Usage |
|-------|------|-------|
| `--font-heading` | Playfair Display | display headings, brand moments |
| `--font-body` | Lexend | ALL UI text, ≥10.5pt equivalent |

No additional font imports without spec review.

## File Management
Keep single copies · archive explorations to `_archive/` · update this doc when
assets change · never leave dead files.
```

- [ ] **Step 2: Commit governance fix**

```bash
git add docs/brand-governance.md
git commit -m "docs(brand): rewrite governance to House v2 canonical — fixes drift source"
```

### Task 6: Full gates + visual QA smoke

- [ ] **Step 1: All checks green**

```bash
npm run typecheck; npm run lint; npm run test; npm run build
```
Expected: all exit 0. Any failing snapshot/test asserting old colors gets updated in the same commit:

```bash
git add -A; git commit -m "test: align assertions with House v2 tokens"
```

- [ ] **Step 2: Visual smoke (dev server from Task 2 still running)**

Check each route renders correctly, in order: `/` home hero · `/login` · `/register` · student `/dashboard` · `/practice` · `/exams` → start any exam (KaTeX renders, timer visible) · `/results` · `/weakpoints` · teacher/admin dashboard + `/admin/violations`.
Specifically inspect: every `bg-brand-light` surface has readable contrast; buttons read teal not blue; headings render Playfair serif; body reads Lexend.

- [ ] **Step 3: Push for deploy preview**

```bash
git push -u origin feat/rebrand-house-v2
```
Cloudflare Pages preview URL → owner eyeballs it → then (and only then) merge to main.

---

## Self-review notes

- Spec coverage: this plan covers spec §5.1 (rebrand) + §8 lesson #1 (drift fix). §5.2–§5.5 belong to later phase plans (shadcn/dashboard/params/content-engine) — separate plans by design.
- Type consistency: n/a (CSS-only).
- Placeholders: none — all values literal from DESIGN.md.
