"""STAGE 3: Question parsing — merge structure + math, segment, classify, validate.

Input : stage1/stage2 JSON outputs
Output: questions.json {questions: [...], stats, segmentation_report}
Usage : python parse_questions.py <structure.json> <math.json> <out.json>
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time

import psutil

sys.path.insert(0, os.path.dirname(__file__))
from profiler import Profiler, StageStats, write_report

Q_NUM_PATTERNS = [
    re.compile(r"^\s*(?:Q\d+|[Qq]uestion\s*\d+|(\d+)\s*[.)])\s*(?:[-–]\s*)?", re.M),
    re.compile(r"^\s*[A-Da-d]\s*[.)]", re.M),
]
OPTION_PATTERNS = [re.compile(r"^\s*\(?([A-Ea-e])\)?\s*[.:]\s*", re.M)]

LATEX_VIOLATION_PATTERNS = [
    (re.compile(r"(?<!\$)\d(?![\d.\s,)]|$)", re.M), "bare digits outside math"),
    (re.compile(r"\^(?!\{)", re.M), "unbraced superscript"),
    (re.compile(r"_(?!\{)", re.M), "unbraced subscript"),
]


def classify(text: str) -> str:
    stripped = text.strip()
    if re.search(r"\b(?:True|False|T|F)\b", stripped) and len(stripped) < 60:
        return "true_false"
    opt_count = len(OPTION_PATTERNS[0].findall(stripped))
    if opt_count >= 2:
        return "multiple_choice"
    return "short_answer"


def segment(text: str) -> list[str]:
    """Split page text into question chunks by numbering patterns."""
    matches = list(Q_NUM_PATTERNS[0].finditer(text))
    if not matches:
        return [text] if text.strip() else []
    chunks = []
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
    return chunks


def validate_question(q: dict) -> dict:
    """Lightweight validation; returns question with flags."""
    q = dict(q)
    issues = []
    stem = q.get("stem", "")
    for pat, name in LATEX_VIOLATION_PATTERNS:
        if pat.search(stem):
            issues.append(name)
    for opt in q.get("options", []):
        for pat, name in LATEX_VIOLATION_PATTERNS:
            if pat.search(opt):
                issues.append(f"option: {name}")
    q["validation_issues"] = issues
    q["valid"] = len(issues) == 0
    return q


def parse_questions(structure: dict, math: dict, metadata: dict) -> list[dict]:
    questions = []
    for page in structure.get("raw", {}).get("pages", []):
        text_page = page.get("text", "")
        chunks = segment(text_page)
        for chunk in chunks:
            qtype = classify(chunk)
            if qtype == "multiple_choice":
                lines = chunk.splitlines()
                options = []
                stem_lines = []
                for ln in lines:
                    m = OPTION_PATTERNS[0].match(ln)
                    if m and len(options) < 6:
                        options.append(ln[m.end():].strip())
                    else:
                        stem_lines.append(ln)
                stem = "\n".join(stem_lines).strip()
            else:
                stem = chunk
                options = []
            q = {
                "stem": stem,
                "type": qtype,
                "options": options,
                "page": page.get("page"),
                "source_pdf": metadata.get("pdf"),
                "confidence": 0.5,
            }
            questions.append(validate_question(q))
    return questions


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("structure_json")
    ap.add_argument("math_json")
    ap.add_argument("out_json")
    args = ap.parse_args()

    with open(args.structure_json, encoding="utf-8") as f:
        structure = json.load(f)
    with open(args.math_json, encoding="utf-8") as f:
        math = json.load(f)

    prof = Profiler("stage3_parse", pages=structure.get("scanned_pages", 0))
    questions = parse_questions(structure, math, {"pdf": structure.get("pdf")})
    prof.sample(len(questions))

    types = {}
    for q in questions:
        types[q["type"]] = types.get(q["type"], 0) + 1
    valid = sum(1 for q in questions if q["valid"])

    report = {
        "questions": questions,
        "stats": {
            "total": len(questions),
            "by_type": types,
            "valid": valid,
            "invalid": len(questions) - valid,
        },
    }
    elapsed = max(prof.finish().elapsed_s, 1e-9)
    st = StageStats(stage="stage3_parse", pages=len(questions), elapsed_s=elapsed,
                    pages_per_s=len(questions) / elapsed,
                    peak_rss_mb=psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024))
    write_report(args.out_json, [st.to_dict()], {"pdf": structure.get("pdf")})
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False)


if __name__ == "__main__":
    main()
