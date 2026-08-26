"""STAGE 4: Render — KaTeX HTML + Print CSS, then PDF via Edge headless.

Input : questions.json
Output: out/ (index.html + PDF via msedge --headless --print-to-pdf)
Usage : python render_output.py <questions.json> <out_dir>
"""
from __future__ import annotations

import argparse
import html
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from profiler import Profiler, write_report

KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
KATEX_JS = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"
KATEX_AUTO = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"

PRINT_CSS = """
@page { margin: 2cm; }
@media print {
  .question { page-break-inside: avoid; break-inside: avoid; }
  .page-break { page-break-after: always; break-after: page; }
}
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #222; }
.question { border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; margin: 8px 0; }
.qnum { font-weight: 700; color: #0f6; }
.katex-display { overflow-x: auto; }
"""


def escape(s: str) -> str:
    return html.escape(s, quote=False)


def render_page(questions: list[dict], title: str) -> str:
    items = []
    for i, q in enumerate(questions, 1):
        opts = "".join(f"<div class='opt'>{escape(o)}</div>" for o in q.get("options", []))
        flag = "" if q.get("valid", True) else " <span style='color:#c00'>(validation issues)</span>"
        items.append(
            f"<div class='question'><span class='qnum'>Q{i}.</span> "
            f"<span class='stem'>{escape(q['stem'])}</span>{flag}{opts}</div>"
        )
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{escape(title)}</title>
<link rel="stylesheet" href="{KATEX_CSS}">
<style>{PRINT_CSS}</style></head>
<body><h1>{escape(title)}</h1>
{"".join(items)}
<script defer src="{KATEX_JS}"></script>
<script defer src="{KATEX_AUTO}"></script>
<script defer>document.addEventListener('DOMContentLoaded', function() {{
  if (window.renderMathInElement) renderMathInElement(document.body, {{delimiters:[
    {{left:'$$',right:'$$',display:true}},{{left:'$',right:'$',display:false}}]}});
}});</script>
</body></html>"""


def edge_pdf(html_path: str, pdf_path: str) -> float:
    edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge):
        edge = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge):
        return -1
    url = "file:///" + html_path.replace("\\", "/")
    t0 = time.perf_counter()
    subprocess.run(
        [edge, "--headless=new", "--disable-gpu", f"--print-to-pdf={pdf_path}",
         "--no-pdf-header-footer", url],
        capture_output=True, timeout=120,
    )
    return time.perf_counter() - t0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("questions_json")
    ap.add_argument("out_dir")
    ap.add_argument("--title", default="Math Questions")
    ap.add_argument("--no-pdf", action="store_true")
    args = ap.parse_args()

    with open(args.questions_json, encoding="utf-8") as f:
        data = json.load(f)
    questions = data.get("questions", data if isinstance(data, list) else [])

    prof = Profiler("stage4_render", pages=len(questions))
    os.makedirs(args.out_dir, exist_ok=True)
    html_path = os.path.join(args.out_dir, "index.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(render_page(questions, args.title))
    prof.sample(1)

    extra = {"html_bytes": os.path.getsize(html_path)}
    if not args.no_pdf:
        pdf_path = os.path.join(args.out_dir, "output.pdf")
        t = edge_pdf(html_path, pdf_path)
        extra["edge_pdf_s"] = round(t, 2)
        extra["pdf_bytes"] = os.path.getsize(pdf_path) if os.path.exists(pdf_path) else 0

    st = prof.finish(extra=extra)
    write_report(os.path.join(args.out_dir, "report.json"), [st.to_dict()], {})


if __name__ == "__main__":
    main()
