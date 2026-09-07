#!/usr/bin/env bash
# Runs all seven legs of the LLM-market panel pipeline. Idempotent — each
# script overwrites its output CSV. Usage-dev (OpenRouter) will report a
# blocker and skip its CSV if OPENROUTER_API_KEY isn't set (Keychain or env).
# target4_dev_wide.py depends on usage_openrouter_monthly.csv, so it must
# run after fetch_usage_openrouter.py.
set -euo pipefail
cd "$(dirname "$0")"
source .venv/bin/activate

python3 fetch_structure.py
python3 fetch_prices.py
python3 fetch_capability.py
python3 fetch_usage_openrouter.py || true
python3 target4_dev_wide.py
python3 build_usage_enterprise.py
python3 fetch_financials.py
