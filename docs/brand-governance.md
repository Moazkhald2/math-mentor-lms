# Math Mentor — Brand Governance

## Logo System

| Variant | File | Usage |
|---------|------|-------|
| Primary | `/public/logo-main.png` | Navbar, landing page |
| Symbol | `/public/logo-symbol.png` | Favicon, mobile, tight spaces |

**Rules:**
- No stretching or distortion
- Minimum clear space = height of the logo
- Don't recolor or add effects
- Don't place on low-contrast backgrounds

## Colors

| Token | Value | Usage |
|-------|-------|-------|
| `brand` | `#1982C4` | Primary links, buttons, header line |
| `brand-light` | `#36A3DF` | Hover states |
| `brand-dark` | `#13659C` | Active states |
| `accent-green` | `#00784A` | Success |
| `accent-gold` | `#E8BB1A` | Warning |

All defined once in `src/index.css` via `@theme`. Never hardcode hex values in components.

## Typography

| Token | Font | Usage |
|-------|------|-------|
| `--font-montserrat` | Montserrat | All UI text |
| Body inherit | system stack | Long-form reading |

Avoid importing additional fonts unless reviewed.

## File Management

**Downloads folder cleanup rules:**
- Keep only working files (not duplicates)
- Archive old explorations to `_archive/`
- Never have 3 copies of the same file
- Delete unused SVGs after logo finalised

## Adding New Assets

1. Place in `public/` or `src/assets/`
2. Update this doc
3. Remove any old versions
4. Commit — never leave dead files
