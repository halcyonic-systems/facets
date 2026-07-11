#!/usr/bin/env python3
"""Leg 4: Usage (developer channel) — OpenRouter daily rankings API.

GET https://openrouter.ai/api/v1/datasets/rankings-daily
Auth: any valid OpenRouter API key (Bearer), same key used for inference.
Dataset starts 2025-01-01. Rate limit: 30 req/min, 500 req/day per account.

Key resolution order: OPENROUTER_API_KEY env var, then macOS Keychain
(`security find-generic-password -s OPENROUTER_API_KEY -w`). The hal LiteLLM
proxy's .env also carries a working key if neither is set.

Aggregates the daily (date, model_permaslug, total_tokens) rows to monthly
per-author token shares. "Author" = the org prefix of model_permaslug
(e.g. "anthropic/claude-3.5-sonnet-20241022" -> "anthropic"); the reserved
"other" row (everything outside the top 50) is kept as its own author.

Writes usage_openrouter_monthly.csv: month, author, total_tokens,
token_share_pct, is_estimate=false, channel_bias note.

Channel-bias caveat (put in README too): OpenRouter is a self-selected
routing-platform slice. It over-represents open-weights models and excludes
direct-API enterprise traffic. Do not treat this as market-wide usage share
without the enterprise-channel series (usage_enterprise_annual.csv) alongside
it — the report explicitly says never average the two channels.
"""
import csv
import json
import os
import sys
import urllib.request
from collections import defaultdict
from datetime import date, timedelta

from common import DATA_DIR, ensure_data_dir

API_URL = "https://openrouter.ai/api/v1/datasets/rankings-daily"
OUT_COLUMNS = ["month", "author", "total_tokens", "token_share_pct", "is_estimate", "channel_bias"]
CHANNEL_BIAS_NOTE = (
    "self-selected OpenRouter routing slice; over-represents open-weights, "
    "excludes direct-API enterprise traffic"
)


def get_api_key():
    key = os.environ.get("OPENROUTER_API_KEY")
    if key:
        return key
    try:
        import subprocess
        out = subprocess.run(
            ["security", "find-generic-password", "-s", "OPENROUTER_API_KEY", "-w"],
            capture_output=True, text=True, timeout=5,
        )
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    except Exception:
        pass
    return None


def fetch_rankings(api_key: str, start_date: str, end_date: str):
    url = f"{API_URL}?start_date={start_date}&end_date={end_date}&period=day"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "bert-lenses-pipeline/0.1",
    })
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


def month_key(date_str: str) -> str:
    return date_str[:7]  # YYYY-MM


def author_of(permaslug: str) -> str:
    if permaslug == "other":
        return "other"
    return permaslug.split("/", 1)[0] if "/" in permaslug else permaslug


def main():
    ensure_data_dir()
    api_key = get_api_key()
    if not api_key:
        print(
            "BLOCKED: no OPENROUTER_API_KEY found in Keychain or env. "
            "Script is wired and ready — set the key and re-run to produce "
            "usage_openrouter_monthly.csv. Skipping CSV output.",
            file=sys.stderr,
        )
        return 1

    # The dataset starts 2025-01-01 (the API 400s on earlier start dates) and
    # a single request may span at most 366 days, so page in non-overlapping
    # ≤365-day windows.
    start = date(2025, 1, 1)
    today = date.today()

    monthly_totals = defaultdict(lambda: defaultdict(int))  # month -> author -> tokens
    cursor = start
    while cursor <= today:
        chunk_end = min(today, cursor + timedelta(days=364))
        payload = fetch_rankings(api_key, cursor.isoformat(), chunk_end.isoformat())
        for row in payload.get("data", []):
            m = month_key(row["date"])
            a = author_of(row["model_permaslug"])
            monthly_totals[m][a] += int(row["total_tokens"])
        cursor = chunk_end + timedelta(days=1)

    rows_out = []
    for month, authors in sorted(monthly_totals.items()):
        month_total = sum(authors.values()) or 1
        for author, tokens in sorted(authors.items(), key=lambda kv: -kv[1]):
            rows_out.append({
                "month": month,
                "author": author,
                "total_tokens": tokens,
                "token_share_pct": round(100 * tokens / month_total, 3),
                "is_estimate": "false",
                "channel_bias": CHANNEL_BIAS_NOTE,
            })

    out_path = DATA_DIR / "usage_openrouter_monthly.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUT_COLUMNS)
        writer.writeheader()
        for row in rows_out:
            writer.writerow(row)

    print(f"wrote {out_path} ({len(rows_out)} rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
