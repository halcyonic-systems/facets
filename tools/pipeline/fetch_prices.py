#!/usr/bin/env python3
"""Leg 1 (Prices) — litellm model_prices_and_context_window.json, replayed
at month-end snapshots via git history.

Clones BerriAI/litellm with --filter=blob:none (full commit history, blobs
fetched on demand) into the scratch dir, then for each month-end from
2023-09-30 onward: finds the last commit before the next month started
(`git rev-list -1 --before=<next-month-1st> HEAD`), reads
model_prices_and_context_window.json at that commit, and keeps chat-mode
entries only (~84% of entries have token prices; the rest are
embedding/image/audio and are skipped).

The file lived at litellm/model_prices_and_context_window.json before a
2023-09-06 "move model_prices to root github" commit; snapshots at or after
that date read the root path directly, which is why the panel starts there.
Jan-Aug 2023 (GPT-4 launch era) is NOT backfilled — out of scope for this
pipeline, documented as a known gap in README.md.

Writes prices_monthly.csv: month, provider, model, input_usd_per_Mtok,
output_usd_per_Mtok, price_jump_flag. price_jump_flag is a cheap heuristic
(>3x change vs. the same model's prior month) to surface likely
error-correction commits for manual review — it is NOT a definitive filter.
"""
import csv
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

from common import DATA_DIR, SCRATCH_DIR, ensure_data_dir

REPO_URL = "https://github.com/BerriAI/litellm.git"
PRICE_FILE = "model_prices_and_context_window.json"
START_YEAR_MONTH = (2023, 9)
OUT_COLUMNS = [
    "month", "provider", "model",
    "input_usd_per_Mtok", "output_usd_per_Mtok", "price_jump_flag",
]


def run(cmd, cwd):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)


def ensure_repo() -> Path:
    repo_dir = SCRATCH_DIR / "litellm"
    if (repo_dir / ".git").exists():
        run(["git", "fetch", "--filter=blob:none", "origin"], cwd=repo_dir)
        return repo_dir
    repo_dir.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["git", "clone", "--filter=blob:none", REPO_URL, str(repo_dir)],
        check=True,
    )
    return repo_dir


def month_range(start_ym, end_date: date):
    y, m = start_ym
    out = []
    while (y, m) <= (end_date.year, end_date.month):
        out.append((y, m))
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


def next_month_str(y, m):
    ny, nm = (y + 1, 1) if m == 12 else (y, m + 1)
    return f"{ny:04d}-{nm:02d}-01"


def snapshot_sha(repo_dir: Path, before_date: str):
    result = run(["git", "rev-list", "-1", f"--before={before_date}", "HEAD"], cwd=repo_dir)
    sha = result.stdout.strip()
    return sha or None


def load_prices_at(repo_dir: Path, sha: str):
    result = run(["git", "show", f"{sha}:{PRICE_FILE}"], cwd=repo_dir)
    if result.returncode != 0:
        return None
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return None


def main():
    ensure_data_dir()
    repo_dir = ensure_repo()

    today = date.today()
    months = month_range(START_YEAR_MONTH, today)

    rows = []
    last_price = {}  # (provider, model) -> (input, output)
    seen_shas = {}

    for (y, m) in months:
        before = next_month_str(y, m)
        sha = snapshot_sha(repo_dir, before)
        if not sha:
            continue
        month_str = f"{y:04d}-{m:02d}"
        data = load_prices_at(repo_dir, sha)
        if data is None:
            print(f"skip {month_str}: could not read {PRICE_FILE} at {sha[:10]}", file=sys.stderr)
            continue
        seen_shas[month_str] = sha

        for model_key, spec in data.items():
            if not isinstance(spec, dict):
                continue
            if spec.get("mode") != "chat":
                continue
            in_cost = spec.get("input_cost_per_token")
            out_cost = spec.get("output_cost_per_token")
            if in_cost is None or out_cost is None:
                continue
            provider = spec.get("litellm_provider", "")
            in_mtok = round(in_cost * 1_000_000, 6)
            out_mtok = round(out_cost * 1_000_000, 6)

            key = (provider, model_key)
            flag = "false"
            prev = last_price.get(key)
            if prev:
                prev_in, prev_out = prev
                if prev_in > 0 and (in_mtok / prev_in > 3 or prev_in / max(in_mtok, 1e-9) > 3):
                    flag = "true"
                elif prev_out > 0 and (out_mtok / max(prev_out, 1e-9) > 3 or prev_out / max(out_mtok, 1e-9) > 3):
                    flag = "true"
            last_price[key] = (in_mtok, out_mtok)

            rows.append({
                "month": month_str,
                "provider": provider,
                "model": model_key,
                "input_usd_per_Mtok": in_mtok,
                "output_usd_per_Mtok": out_mtok,
                "price_jump_flag": flag,
            })

    out_path = DATA_DIR / "prices_monthly.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUT_COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    flagged = sum(1 for r in rows if r["price_jump_flag"] == "true")
    print(f"wrote {out_path} ({len(rows)} rows, {len(seen_shas)} monthly snapshots, {flagged} flagged jumps)")


if __name__ == "__main__":
    main()
