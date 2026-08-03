# Downloads Folder — Cleanup Plan

Current problem: 18 duplicate/unecessary files mixed with working ones.

## What to keep

| File | Reason |
|------|--------|
| `Logo-Files/PNG/1.png` | Primary logo (already in site as `logo-main.png`) |
| `Logo-Files/PNG/10.png` | Secondary logo (already in site as `logo-secondary.png`) |
| `Logo-Files/SVG/1.svg` | Master vector — source of truth |
| `Logo-Files/AI/Master-File.ai` | Original design file |
| `Logo-Files/PNG/2-9.png` | Keep if used for mockups |
| `TheMathMentor_ Brand-Guideline MQ.pdf` | Reference (16MB) |

## What to delete

| File | Problem |
|------|---------|
| `Logo-Files/PNG/1.png` (duplicates in Logo-Files subdirs) | Exact copies |
| `Logo-Files/PDF/*` (all 12+) | Useless without vectors |
| `Logo-Files/SVG/2-12.svg` | Abandoned explorations |
| `logo-main.png` (in root) | Duplicate |
| `logo-symbol.png` (in root) | Duplicate |
| `Logo-Banner.png` | Unused |

## Recommended command

```bash
# Archive old explorations
mkdir -p "Logo-Files/_archive/svg-explorations"
mv Logo-Files/SVG/2.svg Logo-Files/SVG/3.svg Logo-Files/SVG/4.svg Logo-Files/SVG/5.svg Logo-Files/SVG/6.svg Logo-Files/SVG/7.svg Logo-Files/SVG/8.svg Logo-Files/SVG/9.svg Logo-Files/SVG/10.svg Logo-Files/SVG/11.svg Logo-Files/SVG/12.svg Logo-Files/_archive/svg-explorations/

# Move PDFs to archive
mkdir -p "Logo-Files/_archive/pdf"
mv Logo-Files/PDF/* Logo-Files/_archive/pdf/

# Remove root duplicates
rm logo-main.png logo-symbol.png
```

After cleanup: ~6 essential files instead of 18+.
