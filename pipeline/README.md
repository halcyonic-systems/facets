# LLM-market data pipeline

Builds the monthly CSV panel defined in the verified deep-research report
(`operations/sessions/2026-07-11/references/llm-market-data-foundation.md`
in the vault) for bert-lenses#14 target 4 (LLM market, frontier + open).

Six legs, six scripts, six output CSVs. Data lives **outside this repo**, in
`/Users/home/Documents/bert-lenses/data/` (override with the
`BERT_LENSES_DATA_DIR` env var). Nothing under that path is committed.

## Setup

```bash
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt   # currently empty — stdlib only
```

## Run everything

```bash
./run_all.sh
```

Or run legs individually — every script is idempotent (overwrites its
output CSV) and safe to re-run.

## Legs

### 1. Prices — `fetch_prices.py` → `prices_monthly.csv`
Source: [BerriAI/litellm](https://github.com/BerriAI/litellm)
`model_prices_and_context_window.json`. The file only holds *current*
prices, so the script clones the full repo history
(`git clone --filter=blob:none`, blobs fetched on demand) and replays
month-end snapshots: for each month, `git rev-list -1 --before=<next-month-1st>
HEAD` finds the last commit before the month closed, then `git show
<sha>:model_prices_and_context_window.json` reads the file as of that
commit. Chat-mode entries only (`mode == "chat"`, ~78% of ~2,960 entries at
HEAD; the rest are embedding/image/audio/rerank/etc. and are skipped).

Columns: `month, provider, model, input_usd_per_Mtok, output_usd_per_Mtok,
price_jump_flag`. `price_jump_flag` is a cheap heuristic (>3x change vs. the
same model's prior-month price) meant to surface likely error-correction
commits for manual review — it is a flag, not a filter; 85 of 29,502 rows
are flagged in the 2023-09→2026-07 pull.

**Coverage starts 2023-09-06.** The pricing file lived at
`litellm/model_prices_and_context_window.json` before a commit dated
2023-09-06 ("move model_prices to root github") relocated it to the repo
root; this script only reads the root path, so 2023-09 is the first
reachable month. **Jan–Aug 2023 (the GPT-4 launch era) is not backfilled** —
out of scope for this pipeline; a separate research task would need to pull
from Epoch AI or OpenAI's own announcement archive.

### 2. Structure — `fetch_structure.py` → `models.csv`
Source: [Epoch AI "Data on AI Models"](https://epoch.ai/data/ai_models.zip)
(`notable_ai_models.csv`, 1,035 rows as pulled). License: CC-BY 4.0
(confirmed in the zip's `README.md` at pull time, 2026-07-11).

Columns: `model, organization, publication_date, parameters, training_flop,
training_cost_usd_2023, cost_confidence, is_estimate`. `is_estimate` is
always `true` — training cost/FLOP figures are Epoch's estimates, not
disclosed by labs.

### 3. Capability — `fetch_capability.py` → `capabilities.csv`
Source: [Epoch AI Benchmarking Hub](https://epoch.ai/data/benchmark_data.zip).
**This was the one open item in the research report** ("exact CSV URL +
license UNCONFIRMED"). Confirmed at pull time: `epoch.ai/data` lists an "AI
Capabilities" ZIP at this URL, license CC-BY 4.0 (stated both on the page
and in the zip's `README.md`). The zip bundles a model-level composite
index (`epoch_capabilities_index.csv`, the "ECI Score") plus one CSV per
individual benchmark, all joined on `Model version`. This script joins the
index against `gpqa_diamond.csv`, `swe_bench_verified.csv`, and
`mmlu_external.csv` (many more benchmark CSVs are in the zip —
FrontierMath, SimpleQA, ARC-AGI, METR time-horizons, etc. — add columns to
`BENCHMARK_FILES` in the script to pull more).

Columns: `model_version, display_name, organization, release_date,
eci_score, eci_confidence, gpqa_diamond, swe_bench_verified, mmlu,
is_estimate`. `is_estimate` is `false` — these are measured benchmark runs.

### 4. Usage (developer channel) — `fetch_usage_openrouter.py` → `usage_openrouter_monthly.csv`
Source: OpenRouter `/datasets/rankings-daily` API (top-50 models/day by
token total, plus one `other` rollup row per day). Requires an OpenRouter
API key (Bearer auth, same key as inference), rate-limited 30 req/min /
500 req/day. Dataset starts 2025-01-01.

**Blocked as of 2026-07-11**: no `OPENROUTER_API_KEY` found in macOS
Keychain (`security find-generic-password -s OPENROUTER_API_KEY -w`) or in
the environment. The script is fully wired — set the key and re-run to
produce the CSV. It aggregates daily `(date, model_permaslug, total_tokens)`
rows to monthly per-author token shares (author = the org prefix of the
permaslug, e.g. `anthropic/claude-3.5-sonnet` → `anthropic`; the reserved
`other` row is kept as its own author).

Columns: `month, author, total_tokens, token_share_pct, is_estimate=false,
channel_bias`. **Channel-bias caveat**: this is a self-selected
routing-platform slice — it over-represents open-weights models and
excludes direct-API enterprise traffic. See the cross-cutting note below.

### 5. Usage (enterprise channel) — `build_usage_enterprise.py` → `usage_enterprise_annual.csv`
Source: Menlo Ventures 2025 State of GenAI in the Enterprise survey
(n=495 US enterprise decision-makers, Nov 2025). No downloadable CSV exists
for this survey — hand-entered from the verified report, only the
year/provider points the report states explicitly (no interpolated years,
no fabricated midpoints where the report gave just two endpoints — e.g.
OpenAI and Google each have a 2023 and 2025 point but no 2024).

Columns: `year, provider, enterprise_spend_share_pct, is_estimate=true,
source="Menlo 2025 survey (n=495)"`.

### 6. Financials — `fetch_financials.py` → `financials.csv`
Source: [Epoch AI "Data on AI Companies"](https://epoch.ai/data/ai_companies.zip),
CC-BY 4.0 confirmed. Uses the two dated point-in-time series
(`ai_companies_revenue_reports.csv`, `ai_companies_compute_spend.csv`)
rather than the single aggregate `ai_companies.csv` (one row per company,
no time axis) — the panel needs dates.

Columns: `date, company, metric, value_usd, confidence, is_estimate,
category, source_type`. `metric` is `revenue_annualized_usd` or
`compute_opex_usd`. All rows `is_estimate=true` — Epoch's own README states
these are sourced estimates rated Confident/Likely, not audited financials
("companies sometimes make false claims").

## Cross-cutting conventions

- **`is_estimate`**: every CSV carries this column, per-row (not just
  per-file), even where every row in a given CSV shares the same value —
  keeps the schema uniform for downstream joins.
- **Two usage channels, never averaged.** `usage_openrouter_monthly.csv`
  (developer/routing-platform slice, ~1/3 open-weights) and
  `usage_enterprise_annual.csv` (enterprise spend, ~11% open-weights)
  measure different market segments and actively disagree. Model them as
  two coupled series, not one blended "usage share."
- **No pre-Sep-2023 prices.** Documented above under leg 1.
- **Refuted claims excluded from this pipeline** (per the report's
  adversarial verification pass, 0–3 votes): per-author OpenRouter token
  *totals* like "DeepSeek 14.37T" (the monthly *shares* this pipeline
  computes are a different, verified claim), and the ~0.05–0.07
  price-elasticity figure. Neither appears anywhere in these scripts.
- **Licenses as verified at pull time (2026-07-11)**: all three Epoch AI
  datasets (models, capabilities, companies) are CC-BY 4.0, confirmed by
  each zip's own `README.md`, not assumed from a blanket "Epoch is CC-BY"
  claim (the report flagged that blanket claim as refuted 0–3 — check each
  dataset).

## Refresh

Re-run `./run_all.sh` (or an individual script) at any time; every output
CSV is overwritten in place. `fetch_prices.py` re-clones/fetches litellm
into the scratch dir if it isn't already there, so a clean environment
works with no manual setup beyond the venv.
