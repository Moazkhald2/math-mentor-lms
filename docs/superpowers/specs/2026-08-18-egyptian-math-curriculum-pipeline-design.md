# Egyptian Math Curriculum Pipeline Design

**Date**: 2026-08-18
**Status**: Approved
**Author**: AI Assistant

---

## Executive Summary

Build a **free, local, CPU-only** pipeline to extract 10,000-100,000 pages of Egyptian mathematics curriculum PDFs (Grades 1-12) into structured `Question[]` objects, rendered as KaTeX HTML and print-ready PDFs.

**Stack**: PyMuPDF4LLM (structure) + Docling (math/formulas) + KaTeX (render)
**Hardware**: AMD Ryzen 3 PRO 4450U, 32GB RAM, 8 threads — no GPU required
**Cost**: $0 forever — all MIT/Apache licensed
**Time**: ~2-3 hours for 10K pages

---

## Problem Statement

### Input
- ~10 grades x 10 PDFs x 100-1000 pages = 10K-100K pages
- Source: MOE official textbooks (born-digital), El-Moasser, Al Jumhoriyah, EKB
- Formats: Born-digital (70%), scanned (30%)
- Language: English only (math content)

### Output Requirements
1. **Structured questions** matching existing `Question` type (multiple_choice, true_false, short_answer)
2. **Web rendering**: KaTeX HTML, filterable by grade/chapter/topic
3. **Print PDFs**: Worksheets, mock exams, answer keys — professional layout
4. **Thanaweya Amma alignment**: 4 subjects (Algebra/Geometry, Calculus, Statics, Dynamics)

### Constraints
- **Zero budget** — no cloud APIs, no GPU cloud
- **Local only** — privacy, offline capability
- **English math only** — simplifies RTL, Arabic numerals, notation variants
- **Your hardware** — AMD Ryzen 3 PRO 4450U, 32GB RAM, integrated GPU (2GB VRAM)

---

## Solution Architecture

### Two-Stage Pipeline

```
+-----------------------------------------------------------------+
| STAGE 1: PyMuPDF4LLM — Fast Structure Extraction (500 pg/s)    |
|   * All pages: headings, tables, images, reading order         |
|   * Math region detection via font analysis (CMMI10, etc.)     |
|   * Output: JSON + page-level math flags                       |
+------------------+----------------------------------------------+
                   |
       +-----------+-----------+
       v           v           v
  +---------+  +---------+  +---------+
  | Regular |  |  Math   |  | Scanned |
  |  pages  |  |  pages  |  |  pages  |
  +----+----+  +----+----+  +----+----+
       |           |           |
       v           v           v
  Direct to    Docling      Docling
  Question[]   (formula)    (full OCR)
  parser       detection    + layout
       |           |           |
       +-----------+-----------+
                   v
      +-------------------------+
      | STAGE 2: Merge & Render |
      | * Zod validation        |
      | * LaTeX lint            |
      | * Deduplication         |
      | * KaTeX + Print CSS     |
      +-------------------------+
```

---

## Tool Justification

| Tool | Role | Why |
|------|------|-----|
| **PyMuPDF4LLM** | Structure | 500+ pg/s, native CPU, GNN layout, detects font-based math regions |
| **Docling** | Math/Formulas | Formula detection, LaTeX output, table recognition, CPU-friendly |
| **KaTeX** | Render | 100% English math support, fast, no LaTeX install |
| **Print CSS** | PDF | `@page` rules, professional layout, browser-based |

### Rejected Alternatives
| Tool | Reason |
|------|--------|
| Marker | Requires NVIDIA GPU + vLLM for math; Python 3.14 + Pillow broken on Windows |
| Nougat | Stale, CC-BY-NC license, slow |
| PaddleOCR | Formula detection weaker; RTL post-process complexity |
| Cloud APIs (Gemini) | Cost at scale; violates "free/local" constraint |

---

## Data Model

### EgyptianQuestion (extends existing Question)

```typescript
interface EgyptianQuestion extends Question {
  // Curriculum metadata
  grade: 1-12;
  stage: 'primary' | 'preparatory' | 'secondary';
  term: 1 | 2;

  // Secondary track (Grades 10-12)
  track?: 'scientific-math' | 'scientific-bio' | 'literary';
  subject?: 'algebra-geometry' | 'calculus' | 'statics' | 'dynamics' | 'statistics';

  // Thanaweya alignment
  thanaweya_weight: 'high' | 'medium' | 'low';
  thanaweya_chapter: string;  // e.g., "derivatives", "vectors"

  // Source tracking
  source_pdf: string;
  source_page: number;
  extraction_confidence: number;
}
```

### Curriculum Mapping (Official MOE Structure)

| Stage | Grades | Math Subjects |
|-------|--------|---------------|
| Primary | 1-6 | Mathematics (single) |
| Preparatory | 7-9 | Mathematics (single) |
| Secondary - Scientific-Math | 10-12 | **4 papers**: Algebra/Geometry, Calculus, Statics, Dynamics |
| Secondary - Scientific-Bio | 10-12 | Statistics only |
| Secondary - Literary | 10-12 | Statistics only |

**Thanaweya Chapters (9 total, 1196 questions)**:
1. Limits & Continuity (108)
2. Derivatives (184)
3. Applications of Derivatives (125)
4. Integrals (146)
5. Applications of Integrals (89)
6. Statistics & Probability (142)
7. Vectors (143)
8. Complex Numbers (114)
9. Matrices (145)

---

## Pipeline Components

### 1. `scripts/extract_structure.py` — PyMuPDF4LLM

```python
def extract_structure(pdf_path: Path) -> ExtractionResult:
    """
    Fast pass: 500 pg/s
    Returns:
    - pages: List[PageData] {text, headings, tables, images, bboxes}
    - math_pages: List[int] — page indices with detected math fonts
    - metadata: {grade, stage, term, track} from filename/path
    """
```

**Math Detection Heuristic**:
- Scan font names for math fonts: `CMMI10`, `CMSY10`, `MTEX`, `MathJax`, `STIX`
- Flag pages with >5 math-font characters or `$$`/`$` patterns

### 2. `scripts/extract_math.py` — Docling

```python
def extract_math(pdf_path: Path, math_pages: List[int]) -> MathExtractionResult:
    """
    Targeted: ~2 pg/s on flagged pages only
    Returns:
    - formulas: List[Formula] {page, bbox, latex, confidence}
    - tables: List[Table] {page, bbox, markdown, html}
    - layout: reading order, heading hierarchy
    """
```

**Docling Config**: `accelerator="cpu"`, disable OCR for born-digital, enable formula enrichment

### 3. `scripts/parse_questions.py` — Merge & Validate

```python
def parse_questions(
    structure: ExtractionResult,
    math: MathExtractionResult,
    metadata: CurriculumMetadata
) -> List[EgyptianQuestion]:
    """
    1. Merge: structure.pages + math.formulas + math.tables
    2. Segment: Heuristics for question boundaries (numbering, spacing)
    3. Classify: multiple_choice | true_false | short_answer
    4. Extract: stem, options, correct_answer, explanation
    5. Validate: Zod schema + LaTeX lint + dedup hash
    6. Enrich: grade, stage, track, chapter, thanaweya_weight
    """
```

**Question Segmentation Heuristics**:
- Numbered patterns: `1.`, `1)`, `Q1`, `Question 1`
- Visual: blank line before/after, bold stem
- Options: `A.`, `B.`, `(a)`, `(b)` patterns
- Answer key proximity: "Answer:", "Correct:", adjacent page

### 4. `scripts/render_output.py` — KaTeX + Print CSS

```python
def render_outputs(questions: List[EgyptianQuestion], out_dir: Path):
    """
    1. HTML: React components (your existing LatexRenderer + QuestionCard)
    2. PDF: Print CSS (@page, margins, headers, page-break-inside: avoid)
    3. Index: filterable by grade/chapter/topic/difficulty
    """
```

**Print CSS Key Rules**:
```css
@page { margin: 2cm; @top-center { content: "Grade X - Chapter Y"; } }
.question { page-break-inside: avoid; }
.katex-display { overflow-x: auto; }
```

---

## Test Strategy

### Fixtures (from your PDFs)
```
tests/fixtures/
+-- prep1-born-digital.pdf      # 5 pages, MOE official
+-- prep1-scanned.pdf           # 5 pages, El-Moasser
+-- sec3-calculus.pdf           # 5 pages, Thanaweya calculus
+-- sec3-statics.pdf            # 5 pages, Thanaweya statics
```

### Test Layers

| Layer | Tool | Validates |
|-------|------|-----------|
| **Unit** | Vitest | Font math detection, question segmentation, LaTeX lint |
| **Integration** | Vitest | Full pipeline: PDF -> Question[] (golden JSON) |
| **Visual** | Playwright | HTML -> PDF screenshot vs golden PNG |
| **Schema** | Zod | Every Question[] matches EgyptianQuestion |

### Golden Files
- `prep1-born-digital.golden.json` — expected Question[]
- `sec3-calculus.golden.pdf` — rendered PDF baseline

---

## CI/CD Pipeline

```yaml
# .github/workflows/extract-curriculum.yml
jobs:
  extract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install -r requirements.txt
      - run: python scripts/extract_structure.py --input-dir pdfs/
      - run: python scripts/extract_math.py --input-dir pdfs/
      - run: python scripts/parse_questions.py
      - run: python scripts/render_output.py
      - run: npm test  # Vitest + Playwright
```

**Cache**: `~/.cache/huggingface` (Docling models), `~/.cache/pymupdf`

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Math font detection misses pages | Medium | Medium | Conservative flagging; manual review queue |
| Docling formula confidence low | Medium | Medium | Threshold + fallback to text-layer LaTeX |
| Question segmentation errors | High | High | Pattern library + human review sample |
| Duplicate questions across books | High | Medium | Content hash (SHA256 normalized) dedup |
| Statics/Dynamics diagrams | Medium | Medium | Extract as images; caption-question linking |

---

## Rollout Plan

### Phase 1: Core Pipeline (Week 1)
- [ ] `extract_structure.py` + math font detection
- [ ] `extract_math.py` + Docling integration
- [ ] Unit tests on 3 fixture PDFs

### Phase 2: Question Parser (Week 2)
- [ ] Segmentation heuristics
- [ ] Zod validation + LaTeX lint
- [ ] Integration tests on fixtures

### Phase 3: Render & Deploy (Week 3)
- [ ] KaTeX HTML + Print CSS
- [ ] Visual regression tests
- [ ] GitHub Actions CI

### Phase 4: Scale & Curriculum (Week 4)
- [ ] Run on full corpus (10K pages)
- [ ] Curriculum metadata enrichment
- [ ] Thanaweya chapter mapping
- [ ] Teacher/admin review UI

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Extraction speed | >100 pg/s combined |
| Math formula accuracy | >90% LaTeX match |
| Question segmentation | >85% correct boundaries |
| Schema validation | 100% pass |
| Visual regression | 0 pixel diff on golden |
| Thanaweya chapter coverage | 9/9 chapters represented |

---

## Appendix: Official Sources

1. **MOE Textbooks**: `moe.gov.eg/ar/elearningenterypage/e-learning` — born-digital PDFs
2. **Student Books Portal**: `studentbooks.moe.gov.eg` — 94 updated curricula 2025-2026
3. **Concepts Folder**: `moe.gov.eg/en/openbook-books/` — Grade 12 four math subjects
4. **Curriculum Frameworks**: `edu2-egypt.com/curriculum-frameworks` — Education 2.0 frameworks
5. **Thanaweya Exams**: `moe.gov.eg/ar/exam-model2022-2023/` — actual past papers

---

## Sign-Off

- [ ] Architecture reviewed
- [ ] Tools validated on hardware
- [ ] Test fixtures identified
- [ ] CI/CD defined
- [ ] Rollout plan approved

**Next Step**: Invoke `writing-plans` skill for detailed implementation plan.