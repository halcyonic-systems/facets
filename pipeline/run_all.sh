#!/usr/bin/env bash
# Runs all six legs of the LLM-market panel pipeline. Idempotent — each
# script overwrites its output CSV. Usage-dev (OpenRouter) will report a
# blocker and skip its CSV if OPENROUTER_API_KEY isn't set (Keychain or env).
set -euo pipefail
cd "$(dirname "$0")"
source .venv/bin/activate

python3 fetch_structure.py
python3 fetch_prices.py
python3 fetch_capability.py
python3 fetch_usage_openrouter.py || true
python3 build_usage_enterprise.py
python3 fetch_financials.py
