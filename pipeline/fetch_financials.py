#!/usr/bin/env python3
"""Leg 6: Financials — Epoch AI Companies dataset.

https://epoch.ai/data/ai-companies -> https://epoch.ai/data/ai_companies.zip,
CC-BY 4.0 confirmed (README.md inside the zip, also stated on the Epoch data
page). Combines the two dated point-in-time series (revenue reports, compute
spend reports) into one long financials.csv rather than the single
aggregate ai_companies.csv row-per-company summary, since the panel needs a
time axis.

Writes financials.csv: date, company, metric, value_usd, confidence,
is_estimate, category, source_type. All rows is_estimate=true — Epoch's own
README warns these are sourced estimates ("Confident"/"Likely"), not audited
financials.
"""
import csv
from pathlib import Path

from common import DATA_DIR, SCRATCH_DIR, download, ensure_data_dir, unzip

ZIP_URL = "https://epoch.ai/data/ai_companies.zip"
OUT_COLUMNS = [
    "date",
    "company",
    "metric",
    "value_usd",
    "confidence",
    "is_estimate",
    "category",
    "source_type",
]


def main():
    ensure_data_dir()
    zip_path = SCRATCH_DIR / "epoch" / "ai_companies.zip"
    download(ZIP_URL, zip_path)
    extract_dir = SCRATCH_DIR / "epoch" / "extract" / "companies"
    unzip(zip_path, extract_dir)

    rows_out = []

    revenue_path = extract_dir / "ai_companies_revenue_reports.csv"
    with open(revenue_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            value = row.get("Annualized revenue (USD)", "")
            if not value:
                continue
            rows_out.append({
                "date": row.get("Date", ""),
                "company": row.get("Company", ""),
                "metric": "revenue_annualized_usd",
                "value_usd": value,
                "confidence": row.get("Confidence", ""),
                "is_estimate": "true",
                "category": row.get("Scope", ""),
                "source_type": row.get("Source type", ""),
            })

    compute_path = extract_dir / "ai_companies_compute_spend.csv"
    with open(compute_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            value = row.get("Total compute spend") or row.get("Amount", "")
            if not value:
                continue
            rows_out.append({
                "date": row.get("Date", ""),
                "company": row.get("Company", ""),
                "metric": "compute_opex_usd",
                "value_usd": value,
                "confidence": row.get("Confidence", ""),
                "is_estimate": "true",
                "category": row.get("Category", ""),
                "source_type": row.get("Source Type", ""),
            })

    out_path = DATA_DIR / "financials.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as f_out:
        writer = csv.DictWriter(f_out, fieldnames=OUT_COLUMNS)
        writer.writeheader()
        for row in rows_out:
            writer.writerow(row)

    print(f"wrote {out_path} ({len(rows_out)} rows)")
    print("license: CC-BY 4.0 (epoch.ai/data/ai_companies.zip README.md, verified 2026-07-11)")


if __name__ == "__main__":
    main()
