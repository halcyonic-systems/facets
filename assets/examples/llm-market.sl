# ── The LLM market, frontier + open, Mobus lens ──────────────────────
# A market is a clearing process, not a container of its producers. The
# labs that release models sit OUTSIDE, as sources feeding capacity in;
# demand sits OUTSIDE too, as the sinks that draw served tokens out.
# What's actually INSIDE — the thing worth modeling as a system — is
# the specific-model dynamics: eight models, each one a component that
# splits its serving capacity across two demand channels, which combine
# many models' supply into one stream per market segment. That
# supply → split → combine → demand shape is Mobus's home ground: a
# flow network, not a Bunge thing-in-environment cut, because there is
# no single bounded "market thing" here to draw a boundary around — only
# the flow-processing machinery a clearing market runs.

system "LLM Market" : Concrete/Social

domain "Frontier and open-weight LLM models clearing supply through two demand channels, sourced from six labs"

# ── Sources: the labs that release model capacity ────────────────────
# Labs are producers, not participants in the clearing process itself —
# once a lab ships a model, the lab's job in this system is done. That
# is why they sit outside as sources rather than inside as components:
# modeling lab internals (training, compute, roadmap) is a different
# system than modeling how released models clear demand.
source Anthropic
source OpenAI
source Google
source Meta
source Alibaba
source "DeepSeek (lab)"

# ── Composition: the eight specific models, each a Splitting boundary ──
# Each model is the thing we're actually modeling the dynamics of: one
# serving capacity that gets divided across the two channels below —
# the same `Splitting` primitive bank-run.sl uses for a flow forking
# into two destinations. Every model here is boundary-facing (it
# receives supply from its lab across the boundary and forwards supply
# across the boundary again to both channels), so every one carries
# `interface` — there is no purely-internal model in this thin
# pass-through market.
component Opus primitive Splitting interface
component Fable primitive Splitting interface
component GPT primitive Splitting interface
component Gemini primitive Splitting interface
component Gemma primitive Splitting interface
component Llama primitive Splitting interface
component Qwen primitive Splitting interface
component DeepSeek primitive Splitting interface

# The two demand channels are the market's clearing mechanisms — each
# one `Combining` many models' supply into a single served stream per
# segment (a router clears, it doesn't stock). They are also
# boundary-facing: they receive supply from every model and deliver the
# cleared stream out to demand, so they carry `interface` too.
component "Developer channel" primitive Combining interface
component "Enterprise channel" primitive Combining interface

# ── Environment: demand, the two segments the channels clear into ────
# Kept as two distinct sinks, never merged into one "demand" node,
# because the load-bearing target-4 data lesson is that developer and
# enterprise demand disagree when measured — open-weights are ~33% of
# dev-channel volume but only ~11% of enterprise spend. Averaging the
# two channels into one number erases the one fact this model exists
# to show.
sink "Developer apps & agents"
sink "Enterprise deployments"

# ── Structure: lab supply fans into models, models fan into channels ──
# Anthropic is the one lab that fans to two models — Opus and Fable —
# both released model capacity from the same source. Google is the one
# lab that fans to two models of DIFFERENT character: Gemini (frontier,
# closed) and Gemma (open-weight) — the single lab in this market
# producing both a closed and an open model, worth noting because it's
# the one source node that straddles the frontier/open-weight split
# that every other lab sits entirely on one side of.
flow Anthropic -> Opus : informational "released model capacity"
flow Anthropic -> Fable : informational "released model capacity"
flow OpenAI -> GPT : informational "released model capacity"
flow Google -> Gemini : informational "released model capacity"
flow Google -> Gemma : informational "released model capacity"
flow Meta -> Llama : informational "released model capacity"
flow Alibaba -> Qwen : informational "released model capacity"
flow "DeepSeek (lab)" -> DeepSeek : informational "released model capacity"

# Every model bonds to BOTH channels — the bipartite supply graph that
# makes this a clearing market rather than eight separate pipelines.
# Sixteen flows: eight models × two channels.
flow Opus -> "Developer channel" : informational "token supply"
flow Opus -> "Enterprise channel" : informational "token supply"
flow Fable -> "Developer channel" : informational "token supply"
flow Fable -> "Enterprise channel" : informational "token supply"
flow GPT -> "Developer channel" : informational "token supply"
flow GPT -> "Enterprise channel" : informational "token supply"
flow Gemini -> "Developer channel" : informational "token supply"
flow Gemini -> "Enterprise channel" : informational "token supply"
flow Gemma -> "Developer channel" : informational "token supply"
flow Gemma -> "Enterprise channel" : informational "token supply"
flow Llama -> "Developer channel" : informational "token supply"
flow Llama -> "Enterprise channel" : informational "token supply"
flow Qwen -> "Developer channel" : informational "token supply"
flow Qwen -> "Enterprise channel" : informational "token supply"
flow DeepSeek -> "Developer channel" : informational "token supply"
flow DeepSeek -> "Enterprise channel" : informational "token supply"

# Each channel clears its cleared supply out to its own demand segment —
# the exostructure, never merged across channels.
flow "Developer channel" -> "Developer apps & agents" : informational "tokens served"
flow "Enterprise channel" -> "Enterprise deployments" : informational "tokens served"

@lens mobus
