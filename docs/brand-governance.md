# Math Mentor — Brand Governance (House v2, canonical)

> Source of truth: `SYSTEM_SPEC.md §2.2` + `DESIGN.md §2`. The 2024 blue palette
> (#1982C4 / Montserrat era) is OBSOLETE. Never reintroduce it.

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
| ink `#2D3436` · muted `#636E72` · paper `#FAF9F6` | | text hierarchy + backgrounds |

Never hardcode hex values in components. Grade accents G4–G11: see DESIGN.md §2.2.

## Typography

| Token | Font | Usage |
|-------|------|-------|
| `--font-heading` | Playfair Display | display headings, brand moments |
| `--font-body` | Lexend | ALL UI text, minimum 10.5pt equivalent |

No additional font imports without spec review.

## File Management
Keep single copies · archive explorations to `_archive/` · update this doc when
assets change · never leave dead files.
