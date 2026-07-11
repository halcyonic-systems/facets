#!/usr/bin/env python3
"""Leg 2: Structure — Epoch AI notable-models dataset.

Downloads https://epoch.ai/data/ai_models.zip, reads notable_ai_models.csv,
and writes models.csv (model, organization, publication_date, parameters,
training_flop, training_cost_usd_2023, cost_confidence, is_estimate).

License: CC-BY 4.0 (Epoch AI, confirmed in the zip's README.md at pull time).
"""
import csv
from pathlib import Path

from common import DATA_DIR, SCRATCH_DIR, download, ensure_data_dir, unzip

ZIP_URL = "https://epoch.ai/data/ai_models.zip"
OUT_COLUMNS = [
    "model",
    "organization",
    "publication_date",
    "parameters",
    "training_flop",
    "training_cost_usd_2023",
    "cost_confidence",
    "is_estimate",
]


def main():
    ensure_data_dir()
    zip_path = SCRATCH_DIR / "epoch" / "ai_models.zip"
    download(ZIP_URL, zip_path)
    extract_dir = SCRATCH_DIR / "epoch" / "extract" / "models"
    unzip(zip_path, extract_dir)

    src = extract_dir / "notable_ai_models.csv"
    out_path = DATA_DIR / "models.csv"
    n = 0
    with open(src, newline="", encoding="utf-8") as f_in, \
         open(out_path, "w", newline="", encoding="utf-8") as f_out:
        reader = csv.DictReader(f_in)
        writer = csv.DictWriter(f_out, fieldnames=OUT_COLUMNS)
        writer.writeheader()
        for row in reader:
            writer.writerow({
                "model": row.get("Model", ""),
                "organization": row.get("Organization", ""),
                "publication_date": row.get("Publication date", ""),
                "parameters": row.get("Parameters", ""),
                "training_flop": row.get("Training compute (FLOP)", ""),
                "training_cost_usd_2023": row.get("Training compute cost (2023 USD)", ""),
                "cost_confidence": row.get("Confidence", ""),
                "is_estimate": "true",
            })
            n += 1

    print(f"wrote {out_path} ({n} rows)")


if __name__ == "__main__":
    main()
