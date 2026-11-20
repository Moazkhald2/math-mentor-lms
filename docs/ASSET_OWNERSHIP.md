# Non-Code Asset & Content Ownership Checklist

Dependency licenses (`THIRD_PARTY_NOTICES.md`) only cover npm packages.
Before commercial sale or white-label licensing, confirm ownership or
commercial rights for every non-code asset below.

## 1. Branding & Static Files (`public/` and `src/assets/`)

| Asset Path | Expected Origin | Commercial Check | Status |
| :--- | :--- | :--- | :---: |
| `public/logo-main.png`, `logo-secondary.png`, `logo-symbol.png`, `logo-white.svg`, `favicon.svg` | Brand artwork | Confirm original creation or full commercial assignment to Moaaz Khaled | `[ ]` Owner to verify |
| `public/qr-site.*`, `public/qr-telegram.*` | Generated QR graphics | Self-generated from project URLs (safe) | `[x]` Verified |
| `public/images/circle.svg`, `coordinate-grid.svg`, `parabola.svg`, `triangle.svg` | Math diagrams | Confirm original SVGs authored for Math Mentor | `[ ]` Owner to verify |
| `src/assets/hero.png` | Landing artwork | Confirm original creation or paid commercial license | `[ ]` Owner to verify |
| `src/assets/react.svg`, `src/assets/vite.svg` | Default Vite starter icons | Unused template files — safe to delete if unreferenced | `[ ]` Cleanup later |

## 2. Fonts & External CDN Assets (`index.html`)

| Asset | License | Status |
| :--- | :--- | :---: |
| Google Fonts — `Lexend` & `Playfair Display` | SIL OFL-1.1 (commercial use allowed) | `[x]` Verified |
| KaTeX CSS/JS via jsDelivr (`katex@0.18.1`) | MIT (commercial use allowed) | `[x]` Verified |

## 3. Curriculum Questions, Explanations & Adaptive Data

- [ ] All exam & practice questions are originally authored (not scanned/copied verbatim from copyrighted textbooks).
- [ ] All worked solutions and hints are originally authored or edited clean-room by Moaaz Khaled.
- [ ] **External misconception datasets warning:** Do **not** import academic datasets (such as *MaE* or *Open Misconceptions*) into production without first confirming they are **not** `CC-BY-NC` (Non-Commercial). Prefer clean-room Egyptian-curriculum recipes authored and reviewed by the owner.
- [ ] Any future paid video lessons use owned recordings hosted on a domain-restricted/signed video host (unlisted YouTube is pilot-only).
