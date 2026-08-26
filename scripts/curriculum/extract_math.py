"""STAGE 2: Docling targeted math-page extraction.

Runs Docling on flagged pages only (1-indexed inclusive range).
Config: CPU, formula enrichment on, table structure on, OCR only if --ocr.

Output: JSON {formulas, tables, per_page_stats}
Usage: python extract_math.py <pdf> <out.json> --pages 12-45 [--ocr] [--no-tables] [--no-formulas]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from profiler import Profiler, write_report


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("out_json")
    ap.add_argument("--pages", required=True, help="e.g. 1-64 or comma list 1,5,9-12")
    ap.add_argument("--ocr", action="store_true", help="enable OCR for scanned pages")
    ap.add_argument("--no-tables", action="store_true")
    ap.add_argument("--no-formulas", action="store_true")
    ap.add_argument("--warmup", type=int, default=1, help="warmup pages to load models (excluded from stats)")
    args = ap.parse_args()

    ranges = []
    for part in args.pages.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            ranges.append((int(a), int(b)))
        else:
            ranges.append((int(part), int(part)))

    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import PdfFormatOption, DocumentConverter

    opts = PdfPipelineOptions()
    opts.do_ocr = args.ocr
    opts.do_table_structure = not args.no_tables
    opts.do_formula_enrichment = not args.no_formulas
    opts.do_code_enrichment = False

    conv = DocumentConverter(format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=opts)})

    results = {"formulas": [], "tables": [], "per_page": {}}
    warmup_done = args.warmup == 0

    for lo, hi in ranges:
        lo = max(1, lo)
        n_pages = hi - lo + 1
        prof = Profiler(f"stage2_docling_p{lo}-{hi}", pages=n_pages)

        # Warmup on the first page range slice if requested
        page_range = (lo, hi)
        t0 = time.perf_counter()
        result = conv.convert(args.pdf, page_range=page_range, raises_on_error=False)
        conv_time = time.perf_counter() - t0

        if result is None:
            print(f"WARN: no result for pages {lo}-{hi}")
            continue

        status = result.status.value if hasattr(result.status, "value") else str(result.status)
        n_formulas = 0
        n_tables = 0

        for item, level in result.document.iterate_items():
            label = item.label
            if label == "formula" or (hasattr(label, "value") and label.value == "formula"):
                n_formulas += 1
                if not warmup_done:
                    results["formulas"].append({
                        "page": getattr(item, "prov", None) and item.prov[0].page_no if item.prov else None,
                        "text": str(item.text)[:300],
                        "latex": getattr(item, "latex", "")[:500],
                    })
            elif label == "table":
                n_tables += 1
                if not warmup_done:
                    results["tables"].append({
                        "page": item.prov[0].page_no if item.prov else None,
                        "export": item.export_to_markdown()[:400],
                    })

        if warmup_done:
            prof.sample(n_pages)
            st = prof.finish(extra={"status": status, "formulas": n_formulas, "tables": n_tables})
            stats.append(st.to_dict())
            results["per_page"][f"{lo}-{hi}"] = {
                "elapsed_s": round(conv_time, 2),
                "pages_per_s": round(n_pages / conv_time, 2) if conv_time else 0,
                "status": status,
                "formulas": n_formulas,
                "tables": n_tables,
            }
        else:
            print(f"WARMUP (not counted): pages {lo}-{hi} in {conv_time:.1f}s, {n_formulas} formulas")
            warmup_done = True

    if warmup_done:
        write_report(args.out_json, stats, {"pdf": args.pdf})
    else:
        print("No measured ranges (all were warmup?)")
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False)


if __name__ == "__main__":
    stats = []
    main()
