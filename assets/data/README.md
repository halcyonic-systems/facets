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
set of files. The demo bundle `assets/demos/llm-market.json` is generated from
the vintage bundle (`bundle --demo`, below), never written by hand.

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
| `openrouter-routed-share-monthly-vintage-<pulldate>.csv` | `aggregate` | the same columns plus `days` (observed days in the month), one row per calendar month (`YYYY-MM`) |
| `openrouter-routed-by-lab-vintage-<pulldate>.csv` | `aggregate` | `date,lab,tokens` |
| `openrouter-routed-share-bundle-vintage-<pulldate>.json` | `bundle` | the forcing bundle: `month,frontier_weight,open_weight,routed_workload`; the level in `Gtok/day` onto `routed workload`, the two weights onto the Router's outwires, all three forced, `every: 30` |
| `openrouter-model-classification.csv` | by hand | `model_permaslug_prefix_or_slug,match,lab,weights,source,checked` |

```bash
export OPENROUTER_API_KEY=...            # the key stays in the environment; the script never reads a file or prints it
python3 scripts/openrouter_rankings_vintage.py pull --start 2025-01-01          # yesterday (UTC) as the end, today as the pull date
python3 scripts/openrouter_rankings_vintage.py aggregate --vintage <pulldate>
python3 scripts/openrouter_rankings_vintage.py bundle --vintage <pulldate> --demo
```

`--demo` also writes `assets/demos/llm-market.json`, the bundle the gallery's
"LLM Serving Market" card opens, so the model arrives already driven by the
observed series with no import step. The demo bundle is a byte-for-byte copy
of the vintage bundle; regenerate it from the vintage with that one command,
never by hand.

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
   unknown and other are on neither wire. `routed_workload` is the observed
   level: all four token classes that month, `other` included, per observed
   day, in Gtok/day; it replaces the model's declared 6000 and the invented
   30-day ramp the demo used to carry. Vintage 2026-10-10 reads 71.9 Gtok/day
   in 2025-01 and 19,197 in 2026-09; the series is the observation, the
   declaration follows it (next rule).
6. **A vintage refresh re-mints the declared amounts in the same PR.** The
   `.sl` declares the routed level and the Router's split from the vintage's
   latest full month (2026-09 for vintage 2026-10-10: 19,197 Gtok/day, the
   month's four token classes per observed day; frontier 254 against open
   746, the month's classified tokens as parts per thousand, the ratio kept
   to three decimals), each grounding `third-party` naming the vintage file
   and the attribution's as-of. A new vintage moves those lines, the two
   children's source amounts (the parent's realized flows, held by
   `child_sources_are_the_parents_realized_flows`), and the three goldens
   (`BLESS_CLI_GOLDEN=1`, `BLESS_SL_DEMOS=1`,
   `BLESS_LLM_MARKET_WALKTHROUGH=1`) together, so the model and the data it
   opens on never disagree silently (facets#534, found when #531 shipped a
   vintage three times the declared 6000). The self-hosted placeholder is
   not minted from anything and stays `unknown`.
5. **Resellers.** OpenRouter's own newsletter excludes reseller activity from
   its weekly totals; whether the Data API does the same is not stated on the
   pages read. The series is used as published and this uncertainty travels
   with any finding until OpenRouter says.

**What this sensor is not.** It sees the routed interface only. Self-hosted
serving has no public sensor and stays `unknown` at its placeholder (facets#523
item 2); the two proxies below are evidence beside that row, not a value for
it. A finding reads "observed on the routed interface (OpenRouter
rankings-daily, vintage YYYY-MM-DD), estimated on the self-hosted one." It is
also OpenRouter's routed traffic, not all routed traffic; the share is what one
router sees.

## Open-weight download proxy (HF, 30-day) (facets#523)

A proxy on the self-hosted interface of `assets/examples/llm-market.sl`: how
often the open-weight families' repositories on the Hugging Face Hub were
downloaded in the last 30 days, per family, as a pinned vintage. It is
attached to the self-hosted row as **evidence**, grade `third-party`, never as
its value: the flow's 3000 Gtok/day stays a placeholder grounded `unknown`,
and nothing here converts to tokens. One download is one fetch of a repo's
config file by anyone (a person, a CI job, a mirror, a serving provider
warming a cache), and says nothing about whether the weights were then run,
how often, or on whose hardware.

**Vintage 2026-10-11.** Pulled 2026-10-11 (local), 1,162 repos across 12
namespaces, 512 of them claimed by the 26-row mapping into 21 (lab, family)
rows. Top five families by 30-day downloads: `qwen3` 196.9M (198 repos),
`gemma-4` 36.8M (38), `llama-3` 17.0M (21), `nemotron-3` 10.7M (32), `glm-5`
10.3M (10); then `deepseek-v4` 8.4M, `deepseek-v3` 8.0M, `gemma-3` 5.3M,
`deepseek-r1` 4.3M. The 650 unclaimed repos are mostly earlier generations
and non-LLM work the classification table has no slug for (`Qwen2.5-*` alone
is 61.8M in the window, `DeepSeek-OCR`, `GLM-OCR`, `Prompt-Guard`,
Voxtral); `aggregate` prints the heaviest fifteen so the mapping can grow
when the classification table does, never ahead of it. `step-5` has no Hub
repo, consistent with its `unknown` row in the classification table.

| file | written by | columns |
|---|---|---|
| `hf-downloads-vintage-<pulldate>.csv` | `pull` | `pulldate,namespace,repo_id,downloads_30d,downloads_all_time`, one row per repo, ordered by namespace then repo; the API's two integers untouched |
| `hf-downloads-by-family-vintage-<pulldate>.csv` | `aggregate` | `pulldate,lab,family,downloads_30d,downloads_all_time,repo_count`, one row per (lab, family), ordered by lab then family |
| `hf-family-mapping.csv` | by hand | `namespace,repo_prefix,lab,family,source` |

```bash
python3 scripts/hf_downloads_vintage.py pull --pulldate 2026-10-11      # no token; ~15 requests
python3 scripts/hf_downloads_vintage.py aggregate --vintage 2026-10-11
```

`--dry-run` on either validates and writes nothing; an existing vintage is
refused, never overwritten. `self-test` (third line of `just check`) pins the
paging, the prefix rule and the sums on `scripts/fixtures/` without the
network.

**The source.** `GET https://huggingface.co/api/models?author=<namespace>&expand[]=downloads&expand[]=downloadsAllTime&limit=1000`,
paged by the `Link: <…>; rel="next"` header (the Hub's OpenAPI description
of `cursor`: "Pagination cursor from Link header"), no token. `downloads` is
the figure the model page labels "Downloads last month"; `downloadsAllTime`
is the lifetime count, returned only when asked for by `expand`. Anonymous
API quota, read 2026-10-11 at
[docs/hub/rate-limits](https://huggingface.co/docs/hub/rate-limits): 500
requests per 5-minute fixed window per IP, "subject to change over time
depending on platform health"; a vintage is about fifteen requests with a
pause between pages, and a 429 is honoured by sleeping out the window the
`RateLimit` header names. No history is published: the 30-day window is what
the API returns today, so this becomes a series only by repeated pulls.
**Cadence: monthly, a new dated file each time**, the windows then abutting
rather than overlapping.

**How the Hub counts**, read 2026-10-11 at
[docs/hub/models-download-stats](https://huggingface.co/docs/hub/models-download-stats):
"Every HTTP request to these files, including `GET` and `HEAD`, will be
counted as a download", where the files are a repo's query files
(`config.json` by default, or the library's own), so a count is requests,
not people and not machines. "GGUF files are self-contained and are not tied
to a single library, so all of them are counted for downloads. This will
double count downloads in the case a user performs cloning of a whole
repository." The page offers Publisher Analytics to publishers who need to
"exclude downloads from CI/CD pipelines, or deduplicate users (i.e. count
unique downloaders)", which is to say the public count does neither. The
Hub's own report, "The State of Open Models, Summer 2026" (huggingface.co/blog/
state-of-open-models-summer-2026, 2026-08-14, read 2026-10-11), says in its
notes on method that downloads "do not capture API usage, private deployments,
or models distributed through other channels".

**The mapping.** `hf-family-mapping.csv` claims a repo by its namespace and a
case-sensitive prefix of the repo name, the longest matching prefix winning
(`GLM-5.3` is `glm-5` under the real table, since 5.3 is a point release of
the family the classification table calls `z-ai/glm-5*`; the fixture table
has a longer prefix to pin the rule). A family is a major version of a lab's
line, named from the slugs in `openrouter-model-classification.csv`, and
every row's `source` names those slugs so the mapping is checkable against
the table it came from. Google, NVIDIA and Tencent share their namespaces
with much else, so the raw file keeps only the claimed repos there; every
other namespace is kept whole, so the unclaimed tail is visible. `THUDM`
returns no repos (the Hub answers for Z.ai under `zai-org` now) and is not
queried.

**Mirrors and quantizers are out.** `unsloth`, `bartowski`, `TheBloke`,
`lmstudio-community`, `mlx-community` and the like redistribute these
weights in formats local runtimes load directly, and carry much of the
local-inference traffic the proxy would most like to see; they are under
other namespaces, so the per-family roll-up does not count them. A second
roll-up that includes the top mirror namespaces is a possible later addition,
clearly labelled as such; it is not in this vintage. Counts are therefore a
floor on Hub-served downloads of each family and nothing more.

**What this proxy is not.** Not tokens, not machines, not self-hosted share.
It cannot be divided by anything on the routed side to give a share. Its
honest use is a ranking of families and a direction of travel between
vintages, with the first difference available from the second pull.

## Local-runtime pull proxy (Ollama): refused (facets#523)

The second proxy, "local-runtime pull proxy (Ollama, cumulative)", was to be
a dated read of `https://ollama.com/library?sort=popular`, one request per
pull date, parsed into per-model cumulative pull counts (one pull per machine
per version, forever: the closest public proxy to own-hardware use). The
owner's go on #523 was conditional on the site's terms allowing a dated
snapshot. Read 2026-10-11:

- `https://ollama.com/robots.txt` allows `/library` (the Disallow list is
  auth, dashboard, settings, and the `/api/`, `/v1/`, `/v2/` endpoints).
- `https://ollama.com/terms` ("Last updated: May 2026"), section 4 "Use of
  Services", lists among the things you may not do: **"Use automated means
  to access our services without permission."**

A script reading the page is automated means, and no permission has been
asked for or given; robots.txt is a convention for crawlers, not a grant
that overrides the terms. So the half is not built. `scripts/ollama_pulls_vintage.py`
exists so that the decision is executable: its `pull` refuses with the
clause quoted and makes no request, `--dry-run` or not, and its `self-test`
(fourth line of `just check`) pins that it refuses and that no
`ollama-pulls-vintage-*.csv` exists. The vintage shape is fixed in the
script's docstring (`pulldate,model,pulls_cumulative`, plus a by-family
roll-up through `hf-family-mapping.csv` with an Ollama name column added
then) so nothing downstream has to be re-decided if permission is granted
(the terms name `support@ollama.com`) or Ollama publishes the counts under a
stated license. The numbers the #523 comment quotes (llama3.1 120M,
deepseek-r1 94M, qwen3 40M pulls on 2026-10-11) were read by hand and are
not a vintage. Grade when built: `third-party`; cumulative, so a series only
by repeated pulls and a first difference; never tokens.
