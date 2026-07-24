# ── The LLM market, frontier + open, Bunge lens ──────────────────────
# Minimal structural distillation of the runnable target-4 model
# (technical/llm-market-target4.json, bert-lenses#14): same economy/market
# shape, three providers instead of six. Bunge's thing-in-environment cut
# puts the providers AND the two demand-clearing channels inside the
# boundary — the market's own supply-and-allocation machinery — and
# leaves the demand side (who actually uses the tokens) outside as the
# environment the market is coupled to.

system "LLM Market" : Concrete/Social
domain "frontier and open-weight LLM providers routing token supply through two coupled demand channels"

# ── Composition: providers, each splitting served capacity two ways ──
# A provider is one serving capability whose output token stream gets
# divided between the two channels below — the same `Splitting`
# primitive bank-run.sl uses for a flow forking into two destinations.
# Three domain-named providers is enough to keep the frontier-vs-open
# contrast that makes this model teach (target 4's data foundation:
# open-weights ≈33% of dev-channel usage vs ≈11% of enterprise spend).
component Anthropic primitive Splitting
component OpenAI primitive Splitting
component "Open-weights labs" primitive Splitting

# The two demand channels are the market's clearing mechanisms — each
# one `Combining` the providers' supply into a single served stream
# (a router clears, it doesn't stock; matches target4's both-Combining
# channels). They are also the ONLY things here that face the demand
# environment directly, so they are the ones that carry `interface` —
# the providers never touch environment, so they never do (mirrors the
# thermostat fix: interface sits on the boundary-facing actuator, not
# the internal controller).
component "Developer channel" primitive Combining interface
component "Enterprise channel" primitive Combining interface

# ── Environment: the two demand-side segments the market is coupled to ──
# Kept as two things, never one, because the load-bearing lesson of the
# target-4 data foundation is that developer and enterprise demand are
# two coupled segments that disagree when measured (open-weights ~33%
# of OpenRouter dev-channel volume vs ~11% of Menlo enterprise spend) —
# collapsing them into one "demand" node would erase the one fact this
# model exists to show.
environment "Developer apps & agents"
environment "Enterprise deployments"

# ── Structure: supply fans out, channels clear, demand draws down ────
# Every provider bonds to BOTH channels — this is what makes the model
# a system and not an aggregate under Bunge's Def 1.1 (a real bond
# between two distinct internal components, not a `mere` relation): the
# providers and the channels are all internal, and these six flows are
# the endostructure that joins them.
flow Anthropic -> "Developer channel" : informational "token supply"
flow Anthropic -> "Enterprise channel" : informational "token supply"
flow OpenAI -> "Developer channel" : informational "token supply"
flow OpenAI -> "Enterprise channel" : informational "token supply"
flow "Open-weights labs" -> "Developer channel" : informational "token supply"
flow "Open-weights labs" -> "Enterprise channel" : informational "token supply"

# Each channel clears its cleared supply out to its own demand segment —
# the exostructure, never merged across channels.
flow "Developer channel" -> "Developer apps & agents" : informational "tokens served"
flow "Enterprise channel" -> "Enterprise deployments" : informational "tokens served"

@lens bunge
