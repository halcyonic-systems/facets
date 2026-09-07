#!/usr/bin/env python3
"""Leg 5: Usage (enterprise channel) — Menlo Ventures 2025 State of GenAI in
the Enterprise survey (n=495 US enterprise decision-makers, Nov 2025).

Hand-entered from the verified deep-research report (no downloadable CSV
exists for this survey). Only the year/provider points the report states
explicitly are included — no interpolation, no fabricated 2024 midpoints
where the report only gave two endpoints.

Writes usage_enterprise_annual.csv: year, provider, enterprise_spend_share_pct,
is_estimate, source. All rows is_estimate=true.
"""
from common import DATA_DIR, ensure_data_dir, write_csv

SOURCE = "Menlo 2025 survey (n=495)"

# (year, provider, enterprise_spend_share_pct)
POINTS = [
    (2023, "Anthropic", 12),
    (2024, "Anthropic", 24),
    (2025, "Anthropic", 40),
    (2023, "OpenAI", 50),      # "~50" in the report
    (2025, "OpenAI", 27),
    (2023, "Google", 7),
    (2025, "Google", 21),
    (2023, "open-weights", 19),
    (2025, "open-weights", 11),
    (2025, "Chinese-open", 1),  # "~1" in the report; no earlier-year figure given
]

OUT_COLUMNS = ["year", "provider", "enterprise_spend_share_pct", "is_estimate", "source"]


def main():
    ensure_data_dir()
    rows = [
        {
            "year": year,
            "provider": provider,
            "enterprise_spend_share_pct": share,
            "is_estimate": "true",
            "source": SOURCE,
        }
        for year, provider, share in POINTS
    ]
    out_path = write_csv(DATA_DIR / "usage_enterprise_annual.csv", rows, OUT_COLUMNS)
    print(f"wrote {out_path} ({len(rows)} rows)")


if __name__ == "__main__":
    main()
