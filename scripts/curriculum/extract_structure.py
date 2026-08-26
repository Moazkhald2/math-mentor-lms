"""STAGE 1: Fast structure extraction with PyMuPDF.

Two strategies, both measured:
  A) raw PyMuPDF page iteration (fastest: text + font scan + blocks)
  B) pymupdf4llm.to_markdown per page (slower but structured markdown)

Output: JSON {pages, math_pages, stats}
Usage: python extract_structure.py <pdf> <out.json> [--pages N] [--strategy both|raw|llm]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import pymupdf as fitz
import pymupdf4llm

sys.path.insert(0, os.path.dirname(__file__))
from profiler import Profiler, write_report

MATH_FONT_HINTS = ("cmmi", "cmsy", "cmex", "mtex", "mathjax", "stix", "ams", "mt2pro", "eufm", "msam", "msbm", "cmbxmi")
MATH_GLYPH_HINTS = ("\u2211", "\u221a", "\u222b", "\u2264", "\u2265", "\u2192", "\u2200", "\u2203", "\u221e", "\u00d7", "\u03b1", "\u03b2", "\u03b8", "\u03c0", "\u0394")


def scan_fonts(page: fitz.Page) -> tuple[bool, set[str]]:
    """Scan font names on a page; return (is_math, fonts_found)."""
    fonts: set[str] = set()
    try:
        raw = page.get_fonts(full=True)
        for f in raw:
            fonts.add(f[3])
    except Exception:
        pass
    math = any(any(h in name.lower() for h in MATH_FONT_HINTS) for name in fonts)
    return math, fonts


def scan_glyphs(page: fitz.Page) -> int:
    """Count math Unicode glyph occurrences in the text layer."""
    text = page.get_text("text")
    return sum(text.count(g) for g in MATH_GLYPH_HINTS)


def strategy_raw(doc: fitz.Document, pages: list[int], prof: Profiler) -> dict:
    """Fast raw pass: text, font scan, block bboxes."""
    out_pages = []
    math_flags = {}
    for i, pno in enumerate(pages, 1):
        page = doc[pno]
        is_math, fonts = scan_fonts(page)
        glyph_hits = scan_glyphs(page)
        math = is_math or glyph_hits > 5
        if math:
            math_flags[pno] = {"fonts": sorted(fonts), "glyph_hits": glyph_hits}
        text = page.get_text("text")
        out_pages.append({
            "page": pno,
            "text": text,
            "chars": len(text),
            "words": len(text.split()),
            "math_font": is_math,
            "glyph_hits": glyph_hits,
            "math_page": math,
            "blocks": len(page.get_text("blocks")),
        })
        if i % 50 == 0:
            prof.sample(i)
    return {"pages": out_pages, "math_flags": math_flags}


def strategy_llm(doc: fitz.Document, pages: list[int], prof: Profiler) -> dict:
    """pymupdf4llm structured markdown pass."""
    out = []
    for i, pno in enumerate(pages, 1):
        t0 = time.perf_counter()
        md = pymupdf4llm.to_markdown(doc, pages=[pno], show_progress=False)
        dt = time.perf_counter() - t0
        out.append({"page": pno, "markdown_chars": len(md), "md_time_s": round(dt, 3)})
        if i % 50 == 0:
            prof.sample(i)
    return {"markdown_pages": out}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("out_json")
    ap.add_argument("--pages", type=int, default=0, help="0 = all pages")
    ap.add_argument("--strategy", default="both", choices=["both", "raw", "llm"])
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    total = doc.page_count
    n = args.pages or total
    pages = list(range(0, min(n, total)))

    stats = []
    result = {"pdf": args.pdf, "total_pages": total, "scanned_pages": n}

    if args.strategy in ("both", "raw"):
        prof = Profiler("stage1_raw_pymupdf", pages=len(pages))
        raw = strategy_raw(doc, pages, prof)
        st = prof.finish(extra={"bytes": os.path.getsize(args.pdf)})
        stats.append(st.to_dict())
        result["raw"] = raw

    if args.strategy in ("both", "llm"):
        prof = Profiler("stage1_pymupdf4llm_md", pages=len(pages))
        llm = strategy_llm(doc, pages, prof)
        st = prof.finish()
        stats.append(st.to_dict())
        result["llm"] = llm

    write_report(args.out_json, stats, {"pdf": args.pdf, "pages": n})
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)


if __name__ == "__main__":
    main()
