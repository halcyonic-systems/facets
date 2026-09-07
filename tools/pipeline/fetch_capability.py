#!/usr/bin/env python3
"""Leg 3: Capability — Epoch AI Benchmarking Hub.

The report flagged the exact CSV/license as unconfirmed at research time.
Confirmed at pull time (2026-07-11): https://epoch.ai/data lists an "AI
Capabilities" ZIP at https://epoch.ai/data/benchmark_data.zip, licensed
CC-BY 4.0 (README.md inside the zip). It bundles epoch_capabilities_index.csv
(the model-level ECI composite score) plus one CSV per individual benchmark
(gpqa_diamond.csv, swe_bench_verified.csv, mmlu_external.csv, etc.), joined
on "Model version".

Writes capabilities.csv: model_version, display_name, organization,
release_date, eci_score, eci_confidence, gpqa_diamond, swe_bench_verified,
mmlu, is_estimate=false (these are measured benchmark runs, not estimates).
"""
import csv
from pathlib import Path

from common import DATA_DIR, SCRATCH_DIR, download, ensure_data_dir, unzip

ZIP_URL = "https://epoch.ai/data/benchmark_data.zip"
OUT_COLUMNS = [
    "model_version",
    "display_name",
    "organization",
    "release_date",
    "eci_score",
    "eci_confidence",
    "gpqa_diamond",
    "swe_bench_verified",
    "mmlu",
    "is_estimate",
]

# (benchmark csv filename, score column, output column)
BENCHMARK_FILES = [
    ("gpqa_diamond.csv", "mean_score", "gpqa_diamond"),
    ("swe_bench_verified.csv", "mean_score", "swe_bench_verified"),
    ("mmlu_external.csv", "EM", "mmlu"),
]


def load_scores(extract_dir: Path, filename: str, score_col: str):
    path = extract_dir / filename
    scores = {}
    if not path.exists():
        return scores
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            model = row.get("Model version", "")
            val = row.get(score_col, "")
            if model and val:
                scores[model] = val
    return scores


def main():
    ensure_data_dir()
    zip_path = SCRATCH_DIR / "epoch" / "benchmark_data.zip"
    download(ZIP_URL, zip_path)
    extract_dir = SCRATCH_DIR / "epoch" / "extract" / "benchmarks"
    unzip(zip_path, extract_dir)

    index_path = extract_dir / "epoch_capabilities_index.csv"
    benchmark_scores = {
        out_col: load_scores(extract_dir, fname, score_col)
        for fname, score_col, out_col in BENCHMARK_FILES
    }

    out_path = DATA_DIR / "capabilities.csv"
    n = 0
    with open(index_path, newline="", encoding="utf-8") as f_in, \
         open(out_path, "w", newline="", encoding="utf-8") as f_out:
        reader = csv.DictReader(f_in)
        writer = csv.DictWriter(f_out, fieldnames=OUT_COLUMNS)
        writer.writeheader()
        for row in reader:
            model = row.get("Model version", "")
            writer.writerow({
                "model_version": model,
                "display_name": row.get("Display name", ""),
                "organization": row.get("Organization", ""),
                "release_date": row.get("Release date", ""),
                "eci_score": row.get("ECI Score", ""),
                "eci_confidence": row.get("Confidence", ""),
                "gpqa_diamond": benchmark_scores["gpqa_diamond"].get(model, ""),
                "swe_bench_verified": benchmark_scores["swe_bench_verified"].get(model, ""),
                "mmlu": benchmark_scores["mmlu"].get(model, ""),
                "is_estimate": "false",
            })
            n += 1

    print(f"wrote {out_path} ({n} rows)")
    print("license: CC-BY 4.0 (epoch.ai/data/benchmark_data.zip README.md, verified 2026-07-11)")


if __name__ == "__main__":
    main()
