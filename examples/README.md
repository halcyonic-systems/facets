# Tether demo data

`llm-market-demo.csv` — **illustrative demo data, not real market figures.** Eight
months of made-up observations for exercising the CSV tether's acceptance path
(bert-lenses#7/#13). The numbers are invented to give the import + comparison
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
