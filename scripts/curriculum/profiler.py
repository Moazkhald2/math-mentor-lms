"""Shared profiling helpers for the curriculum pipeline."""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field

import psutil


@dataclass
class StageStats:
    stage: str
    pages: int = 0
    elapsed_s: float = 0.0
    pages_per_s: float = 0.0
    peak_rss_mb: float = 0.0
    cpu_percent: float = 0.0
    extra: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "stage": self.stage,
            "pages": self.pages,
            "elapsed_s": round(self.elapsed_s, 3),
            "pages_per_s": round(self.pages_per_s, 2),
            "peak_rss_mb": round(self.peak_rss_mb, 1),
            "cpu_percent": round(self.cpu_percent, 1),
            **self.extra,
        }


class Profiler:
    """Measures wall time, peak RSS, and CPU for a pipeline stage."""

    def __init__(self, stage: str, pages: int = 0):
        self.stage = stage
        self.pages = pages
        self.proc = psutil.Process(os.getpid())
        self.start_wall = time.perf_counter()
        self.start_cpu = self.proc.cpu_times()
        self.peak_rss = 0
        self.cpu_accum = 0.0
        self.samples = 0
        self._rss_hist: list[float] = []

    def sample(self, pages_done: int) -> None:
        """Sample RSS/CPU at a checkpoint (e.g. per batch of pages)."""
        rss = self.proc.memory_info().rss / (1024 * 1024)
        self._rss_hist.append(round(rss, 1))
        cpu_now = self.proc.cpu_times()
        start_user, start_sys = self.start_cpu.user, self.start_cpu.system
        self.cpu_accum += (cpu_now.user + cpu_now.system) - (start_user + start_sys)
        self.start_cpu = cpu_now
        self.samples += 1
        self.pages = max(self.pages, pages_done)

    def finish(self, extra: dict | None = None) -> StageStats:
        elapsed = time.perf_counter() - self.start_wall
        cpu = self.proc.cpu_times()
        start_user, start_sys = self.start_cpu.user, self.start_cpu.system
        total_cpu = (cpu.user + cpu.system) - (start_user + start_sys)
        cpu_percent = (total_cpu / elapsed * 100) if elapsed > 0 else 0
        stats = StageStats(
            stage=self.stage,
            pages=self.pages,
            elapsed_s=elapsed,
            pages_per_s=self.pages / elapsed if elapsed > 0 else 0,
            peak_rss_mb=self.proc.memory_info().rss / (1024 * 1024),
            cpu_percent=cpu_percent,
            extra={
                **(extra or {}),
                "rss_hist_mb": self._rss_hist,
                "max_rss_mb": max(self._rss_hist) if self._rss_hist else 0,
            },
        )
        return stats


def write_report(path: str, stats: list[dict], context: dict) -> None:
    report = {"context": context, "stages": stats}
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\n=== REPORT {path} ===")
    for s in stats:
        print(
            f"{s['stage']:28s} {s['pages']:>6} pages  {s['elapsed_s']:>8.1f}s  "
            f"{s['pages_per_s']:>8.2f} pg/s  peak {s['peak_rss_mb']:>8.1f} MB  cpu {s['cpu_percent']:>5.1f}%"
        )
    print("===================\n")
