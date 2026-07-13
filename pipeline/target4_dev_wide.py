#!/usr/bin/env python3
"""Leg 7: Target 4 tether — wide monthly CSV for the LLM competitive-market
BERT model (bert-lenses#14 target 4).

The BERT import wizard refuses long-format panels (needs unique time
values per row), so this leg reshapes the leg-4 long-format
`usage_openrouter_monthly.csv` (month, author, total_tokens, ...) into one
row per month with a fixed set of bucket columns, bucketing the 42 raw
OpenRouter `author` values into six competitive-market segments:
anthropic, openai, google, xai, open_weights, other.

Same channel-bias caveat as leg 4: this is the DEV (OpenRouter routing
platform) channel only — self-selected slice, over-represents
open-weights, excludes direct-API enterprise traffic. Never average with
the Menlo enterprise series (leg 5, `usage_enterprise_annual.csv`).
"""
from collections import defaultdict
from datetime import datetime

from common import DATA_DIR, ensure_data_dir, write_csv

# author -> bucket. Four closed labs get their own column; everything else
# is either a recognized open-weights releaser or falls to "other".
# Judgment calls (ambiguous or closed-but-small) are commented per author.
AUTHOR_BUCKET = {
    # closed frontier labs — dedicated columns
    "anthropic": "anthropic",
    "openai": "openai",
    "google": "google",
    "x-ai": "xai",

    # open-weights releasers (major labs + community finetuners/mergers)
    "meta-llama": "open_weights",
    "deepseek": "open_weights",
    "qwen": "open_weights",
    "alibaba": "open_weights",  # Qwen's parent org, distinct author string in source data
    "mistralai": "open_weights",
    "moonshotai": "open_weights",
    "z-ai": "open_weights",
    "nvidia": "open_weights",
    "microsoft": "open_weights",  # Phi family ships open weights
    "bytedance-seed": "open_weights",
    "tencent": "open_weights",  # Hunyuan open releases
    "minimax": "open_weights",
    "nousresearch": "open_weights",
    "sao10k": "open_weights",
    "thedrummer": "open_weights",
    "gryphe": "open_weights",
    "anthracite-org": "open_weights",  # community finetuner (Magnum), open weights
    "arcee-ai": "open_weights",  # community finetuner, open weights
    "baai": "open_weights",  # Beijing Academy of AI, open releases
    "cognitivecomputations": "open_weights",  # community finetuner (Dolphin), open weights
    "inclusionai": "open_weights",  # Ant Group open-source models (Ling)
    "kwaipilot": "open_weights",  # Kuaishou open coding models
    "liquid": "open_weights",  # Liquid AI LFM, open weights
    "neversleep": "open_weights",  # community finetuner, open weights
    "openchat": "open_weights",  # open-source community model
    "tngtech": "open_weights",  # DeepSeek R1T Chimera merge, open weights
    "xiaomi": "open_weights",  # MiMo open-source models

    # closed-but-small / ambiguous / non-model-author rows -> other
    "amazon": "other",  # closed proprietary (Nova), doesn't clear a dedicated-column bar
    "cohere": "other",  # closed proprietary, small OpenRouter share
    "perplexity": "other",  # closed proprietary (Sonar), small share
    "poolside": "other",  # closed startup, small share
    "infermatic": "other",  # inference/hosting provider, not a model-author lab
    "nex-agi": "other",  # small/unclear provenance
    "openrouter": "other",  # the routing platform itself, not a model author
    "intfloat": "other",  # embedding-model author, not a chat competitor
    "sentence-transformers": "other",  # embedding models, not a chat competitor
    "stepfun": "other",  # mixed open/closed releases, small share, ambiguous
    "other": "other",  # source's own rollup row
}

BUCKETS = ["anthropic", "openai", "google", "xai", "open_weights", "other"]
OUT_COLUMNS = ["month_index", "month_label", "anthropic_tok", "openai_tok",
               "google_tok", "xai_tok", "open_weights_tok", "other_tok", "total_tok"]


def bucket_for(author: str) -> str:
    b = AUTHOR_BUCKET.get(author)
    if b is None:
        print(f"WARNING: unmapped author {author!r} -> defaulting to 'other'")
        return "other"
    return b


def main():
    ensure_data_dir()
    src_path = DATA_DIR / "usage_openrouter_monthly.csv"

    import csv
    monthly = defaultdict(lambda: defaultdict(int))
    with open(src_path, newline="") as f:
        for row in csv.DictReader(f):
            bucket = bucket_for(row["author"])
            monthly[row["month"]][bucket] += int(row["total_tokens"])

    months = sorted(monthly)

    current_month = datetime.now().strftime("%Y-%m")
    if months and months[-1] == current_month:
        print(f"NOTE: dropped in-progress month {months[-1]}")
        months = months[:-1]

    rows = []
    for i, month in enumerate(months, start=1):
        bucket_totals = monthly[month]
        row = {"month_index": i, "month_label": month}
        total = 0
        for b in BUCKETS:
            tok = bucket_totals.get(b, 0)
            row[f"{b}_tok"] = tok
            total += tok
        row["total_tok"] = total
        rows.append(row)

    # self-checks
    month_indices = [r["month_index"] for r in rows]
    assert len(month_indices) == len(set(month_indices)), "month_index not unique"

    for r in rows:
        bucket_sum = sum(r[f"{b}_tok"] for b in BUCKETS)
        assert bucket_sum == r["total_tok"], (
            f"bucket sum {bucket_sum} != total_tok {r['total_tok']} for {r['month_label']}"
        )

    expected_months = len(months)
    assert len(rows) == expected_months, f"expected {expected_months} distinct complete months, got {len(rows)}"

    jan_2025 = next(r for r in rows if r["month_label"] == "2025-01")
    jan_share = jan_2025["anthropic_tok"] / jan_2025["total_tok"] * 100
    assert abs(jan_share - 49.3) <= 0.5, f"Jan-2025 anthropic share {jan_share:.3f}% outside 49.3% +/- 0.5pp"

    out_path = write_csv(DATA_DIR / "target4_dev_wide.csv", rows, OUT_COLUMNS)
    print(f"wrote {out_path} ({len(rows)} rows)")
    print(f"Jan-2025 anthropic share: {jan_share:.3f}%")

    print("\nfirst 3 rows:")
    for r in rows[:3]:
        print(r)
    print("\nlast 2 rows:")
    for r in rows[-2:]:
        print(r)

    print("\nbucket shares, Jan-2025 vs latest month:")
    latest = rows[-1]
    for b in BUCKETS:
        jan_pct = jan_2025[f"{b}_tok"] / jan_2025["total_tok"] * 100
        latest_pct = latest[f"{b}_tok"] / latest["total_tok"] * 100
        print(f"  {b:14s} {jan_pct:6.2f}% -> {latest_pct:6.2f}%  ({jan_2025['month_label']} -> {latest['month_label']})")


if __name__ == "__main__":
    main()
