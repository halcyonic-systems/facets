# Tether demo data

*Moved 2026-09-07 from `examples/` (Phase 4 of #378).*

`llm-market-demo.csv` — **illustrative demo data, not real market figures.** Eight
months of made-up observations for exercising the CSV tether's acceptance path
(facets#7/#13). The numbers are invented to give the import + comparison
surface something plausibly shaped to chew on; do not cite them.

Columns, and how to map them onto a small hand-authored LLM-market model
(frontier producer + open producer → market → adoption):

| column             | map as          | onto                          |
|--------------------|-----------------|-------------------------------|
| `month`            | time            | (supplies Δt = 1 month)       |
| `frontier_output`  | flow magnitude  | the frontier producer's flow  |
| `open_output`      | flow magnitude  | the open producer's flow      |
| `market_inventory` | stock level     | the market component          |
| `adoption_rate`    | parameter       | the market (or consumer)      |

Import it via **Import data (CSV)**, assign each column, declare units on the two
flow magnitudes (e.g. `Mtok/mo`), finish, then Run in the Mobus lens and read the
Simulated-vs-Actual overlay.

The shipped `llm-market` model now takes its workload through two flows, "routed workload" and "self-hosted workload"; the columns above map onto the small hand-authored model this file describes, not onto it (its own bundle is `../demos/llm-market.json`).

## A routed-share bundle for the pooled llm-market (shape only, no data)

The question the pooled model carries (facets#523) is whether the open-weight
share of routed workload moves. The tether can drive that: a forced series on
each of the Router's two outwires sets the split tick by tick (the engine's
weighted fanout, `bert-tether/src/forcing.rs`, test
`forcing_a_splitters_outwires_moves_the_routed_share_and_conserves`). No
observed series exists yet; the one calibration point is June–July 2026 from a
third-party digest of OpenRouter rankings, already written into the model as
the declared weights 35/54. Do not invent rows. When a monthly series exists,
the bundle looks like this:

| column            | map as          | onto                                        | unit     | force |
|-------------------|-----------------|---------------------------------------------|----------|-------|
| `month`           | time            | (one row per observation)                   |          |       |
| `frontier_weight` | flow magnitude  | `Router -> "Frontier serving"`, label "routed frontier workload"    | `weight` | yes   |
| `open_weight`     | flow magnitude  | `Router -> "Open-weight serving"`, label "routed open-weight workload" | `weight` | yes   |
| `routed_workload` | flow magnitude  | `"Routed demand" -> Router`, label "routed workload" (optional)     | `Gtok/day` | yes |

The two weight columns are relative (Mobus Eq. 4.5 edge attributes): the
Router delivers its activity times each weight over the pair's sum, so the
pair need not sum to 100, and only their ratio reaches the run. The unit word
`weight` marks them as control inputs: the readout builds no
simulated-vs-actual comparison for them, and the metric "Open-weight share,
routed" reads the two per-wire series it produces. Past the series' end the
last weight holds (the data-horizon rule, #34). The model's tick is a day, so a
monthly series rides the manifest's `"every": 30` on each weight column, or the
CSV is written one row per tick.
