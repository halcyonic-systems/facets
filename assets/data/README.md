# Pinned data vintages

Author-attachable CSVs for the Data-mode front door. Each file is a **pinned
vintage**: retrieved once, dated in the filename, never silently refreshed —
a re-pull is a new file. The CSV itself stays clean (headers + rows, no
comment lines); provenance lives here.

## fed-h41-vintage-2026-08-11.csv

Two H.4.1 weekly series for the Federal Reserve example, retrieved from FRED
on 2026-08-11, window 2023-01-04 → 2026-08-05 (188 Wednesday observations,
no gaps), millions of USD, not seasonally adjusted:

| column | FRED series | H.4.1 line | binds to (federal-reserve.sl flow) |
|---|---|---|---|
| `WDTGAL` | [WDTGAL](https://fred.stlouisfed.org/series/WDTGAL) — U.S. Treasury, General Account, Wednesday level | Deposits with F.R. Banks, other than reserve balances | `"U.S. Treasury" -> "Balance Sheet"` — TGA deposits |
| `RESPPLLOPNWW` | [RESPPLLOPNWW](https://fred.stlouisfed.org/series/RESPPLLOPNWW) — Earnings remittances due to the U.S. Treasury, Wednesday level | Earnings remittances due to the U.S. Treasury | `"Balance Sheet" -> "U.S. Treasury"` — remittances |

Both are Wednesday **levels** so the dates align (WTREGEN is the week-average
twin of WDTGAL; not used). Two honesty notes the demo should say aloud rather
than smooth over:

- These are **levels of balance-sheet lines, not flow rates**. Binding a level
  series to a flow is a modeling decision the author owns; the sheet observes,
  it does not bless.
- `RESPPLLOPNWW` is **negative** across this whole window (the post-2022
  deferred asset: the Fed's interest expense exceeds portfolio income, so
  remittances are suspended and the liability line runs negative). The data
  contradicting the flow's plain reading is a feature of honest data.

## OpenRouter routed-share vintages (facets#529)

The observatory's first sensor, on the routed interface of
`assets/examples/llm-market.sl` (the Router's two outwires). Retrieved once per
pull date, dated in the filename, never refreshed in place: a re-pull is a new
set of files. The demo bundle `assets/demos/llm-market.json` is untouched; the
vintage bundle is a separate file the gallery does not load.

**Vintage 2026-10-10.** Pulled 2026-10-10 (local), window 2025-01-01 →
2026-10-09, 645 days, 428 permaslugs including `other`. Attribution, as
OpenRouter asks: **Source: OpenRouter (openrouter.ai/rankings), as of
2026-10-11T00:27Z.** Classified with the 149-row table of 2026-10-10:

- Coverage: 91.0% of tokens outside the `other` row carry an `open` or
  `closed` row (85.0% of all tokens; `other` is 6.6% of all tokens). By
  calendar month the classified share of non-`other` tokens runs from 80.6%
  (2026-10, nine days) and 82.3% (2026-03) to 99.2% (2026-07); every month of
  2025 is above 85%.
- 222 permaslugs stay `unknown`. Stealth and router pseudo-models are 5.2% of
  non-`other` tokens and cannot be classified by rule 3, so the ceiling is
  about 95%, not 100%. The heaviest three unknowns: `stealth/space-bunny-alpha`
  (2.8%), `stealth/ox-alpha` (1.4%), `openrouter/owl-alpha` (0.8%). The
  heaviest labelled unknowns are `xiaomi/mimo-v2-pro-20260318` (0.5%, no
  Xiaomi page found for it; the V2.5 and V2.6 cards exist), `upstage/solar-pro4`
  (0.4%, Upstage's page lists Console, Playground and on-premises, which is
  neither public weights nor plainly API-only), `typesafe/jev-1.13` (0.4%, a
  decision model with no weights page), and Alibaba's Qwen `plus`/`max`/`flash`
  API models (1.0% together; Model Studio's page does not say they are
  API-only). The rest is a tail of 200-odd slugs under 0.5% each.

| file | written by | columns |
|---|---|---|
| `openrouter-rankings-daily-vintage-<pulldate>.csv` | `pull` | `date,model_permaslug,total_tokens` — the API's rows, untouched, ordered by date then permaslug (`other` last within its date, as the API returns it) |
| `openrouter-routed-share-vintage-<pulldate>.csv` | `aggregate` | `date,frontier_tokens,open_tokens,unknown_tokens,other_tokens,open_share_low,open_share_high`, one row per day |
| `openrouter-routed-share-monthly-vintage-<pulldate>.csv` | `aggregate` | the same columns, one row per calendar month (`YYYY-MM`) |
| `openrouter-routed-by-lab-vintage-<pulldate>.csv` | `aggregate` | `date,lab,tokens` |
| `openrouter-routed-share-bundle-vintage-<pulldate>.json` | `bundle` | the forcing bundle: `month,frontier_weight,open_weight` on the Router's outwires, unit `weight`, force on, `every: 30` |
| `openrouter-model-classification.csv` | by hand | `model_permaslug_prefix_or_slug,match,lab,weights,source,checked` |

```bash
export OPENROUTER_API_KEY=...            # the key stays in the environment; the script never reads a file or prints it
python3 scripts/openrouter_rankings_vintage.py pull --start 2025-01-01          # yesterday (UTC) as the end, today as the pull date
python3 scripts/openrouter_rankings_vintage.py aggregate --vintage <pulldate>
python3 scripts/openrouter_rankings_vintage.py bundle --vintage <pulldate>
```

`pull` fetches through leg 4 of the llm-market data pipeline
(`tools/pipeline/fetch_usage_openrouter.py`, which pages the same endpoint and
aggregates monthly by author into a data dir outside the repo; the fetch is
shared, not duplicated). It prints `meta.as_of` and the permaslugs the
classification table does not name; record the first in this section as the attribution line, extend the table
with the second before `aggregate`. `--dry-run` on any command validates and
writes nothing. `self-test` (second line of `just check`) pins the arithmetic on
`scripts/fixtures/` without the network.

**The source.** `GET https://openrouter.ai/api/v1/datasets/rankings-daily`
(OpenRouter Data API, read 2026-10-10 at
[docs/cookbook/administration/data-api](https://openrouter.ai/docs/cookbook/administration/data-api)
and
[the endpoint reference](https://openrouter.ai/docs/api/api-reference/datasets/get-rankings-daily)):
per UTC day the top 50 public models by `total_tokens` (`prompt_tokens +
completion_tokens`, a decimal string for 64-bit safety) plus one aggregated
`other` row for every model outside the top 50; `start_date`/`end_date` at most
366 days apart, history from 2025-01-01; any OpenRouter API key, 30 requests a
minute, 500 a day. Licensed CC BY 4.0; the attribution OpenRouter asks for is
"Source: OpenRouter (openrouter.ai/rankings), as of <meta.as_of>", and any
finding quoting the series says **Rankings data by OpenRouter**. Private
models, private endpoints and zero-data-retention traffic are excluded at the
source.

**The sensor's rules** (the owner's rulings on facets#529):

1. **Open weight means the weights are publicly available** (the OpenRouter and
   a16z State of AI definition). It is decided per model in the classification
   table, with a source per row: a URL that was opened and that states the
   weights are public (a model card with the files) or that the model is
   reached through an API only. `match` says how the row applies: `slug` is one
   permaslug (a dated canonical slug also answers for its undated form),
   `prefix` is every model under that author and is used only where the author
   releases one way. A serving variant (`:free`, `:beta`) takes its base slug's
   row. Nothing is classified from memory: an `open` row's URL is a model card
   whose files and license were read (a gated card such as Llama's or Gemma's
   counts as public, since the weights are downloadable on accepting the
   license); a `closed` row's URL is the lab's own model page, which lists API
   endpoints and no download, the caveat being that such a page rarely says
   "weights not released" in so many words. Rows for 149 slugs were made on
   2026-10-10, heaviest first, and the next pull's unmatched list is where the
   table grows. This table supersedes the by-author
   `AUTHOR_BUCKET` in `tools/pipeline/target4_dev_wide.py` (leg 7 of the July
   2026 pipeline) for any open-weight share: that map decides per author from
   memory, this one per model from a page; leg 7 is left as it is for the
   pipeline's own wide panel.
2. **The `other` row is a column of its own**, and the open-weight share is a
   range: `open_share_low` = open over everything (frontier + open + unknown +
   other), `open_share_high` = open over frontier + open. A finding quotes both.
3. **Unlabelled models are `unknown`, never guessed**: a stealth slug
   (`openrouter/...`), an author with no row, or a slug with no `slug` row under
   a mixed author. Unknown tokens are a column and never count as open or as
   frontier.
4. **One vintage per pull date**, first window 2025-01-01 to the pull date,
   daily rows. The monthly file is a resample: calendar-month sums of the four
   token columns, with the shares recomputed from the sums, not averaged. The
   bundle's `month` is the row index (the tether reads time as a number), one
   row per calendar month, riding `every: 30` on the model's day tick; the two
   token sums go in as relative weights (Mobus Eq. 4.5), so only their ratio
   reaches the run, and the bundle carries the high end of the range because
   unknown and other are on neither wire.
5. **Resellers.** OpenRouter's own newsletter excludes reseller activity from
   its weekly totals; whether the Data API does the same is not stated on the
   pages read. The series is used as published and this uncertainty travels
   with any finding until OpenRouter says.

**What this sensor is not.** It sees the routed interface only. Self-hosted
serving has no public sensor and stays `unknown` at its placeholder (facets#523
item 2). A finding reads "observed on the routed interface (OpenRouter
rankings-daily, vintage YYYY-MM-DD), estimated on the self-hosted one." It is
also OpenRouter's routed traffic, not all routed traffic; the share is what one
router sees.
