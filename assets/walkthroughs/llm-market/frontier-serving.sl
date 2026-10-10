# ── Frontier serving, one level down ─────────────────────────────────
# The child of the "Frontier serving" component in
# ../../examples/llm-market.sl (the LLM serving market at pool grain,
# 2026-10-10). The parent treats frontier serving as one Amplifying
# process; this model is its interior: the four frontier models behind
# a pool that divides routed frontier workload by the shares a router
# reports. The roster, its shares and its groundings are carried here
# from the flat model (../../archive/llm-market-flat.sl) unchanged.
#
# The environment stand-ins are the seam's other half, the parent's
# neighbours of the decomposed component name for name, so the kernel's
# boundary contract (bert-core::decomposition) holds. Router sends the
# workload across the interior; the parent's Frontier release pass-way
# fuses onto the subsystem at projection (#226), so the weights cross
# the seam from Frontier labs itself, and this model's own Frontier
# release interface is that port, refined. Serving endpoint takes the
# tokens.
#
# A run is per level. The Router stand-in's amount is the parent's
# realized flow, 6000 Gtok/day routed × 35/89, declared to two decimals
# with a grounding that says so; a knob turned at the parent does not
# move this model until single-run substitution exists.
system "Frontier serving" : Concrete/Social
domain "Routed frontier workload divided across Opus, Fable, GPT and Gemini by routed share, tokens served out, compute shed as heat"
time unit day

level Structure

# ── E′: the parent's neighbours ──────────────────────────────────────
source Router
    description "The parent's routed interface, standing in for the routed frontier workload it sends this subsystem."
    grounding asserted "the parent's realized flow: 6000 Gtok/day routed × 35/89 (Router → Frontier serving in ../../examples/llm-market.sl); recompute when the parent changes"
source "Frontier labs"
    description "Anthropic, OpenAI and Google as research arms, the parent's source of closed weights and API access; the crossing counterparty once the parent's Frontier release pass-way fuses onto this subsystem."
sink "Serving endpoint"
    description "The parent's serving endpoint, where this subsystem's tokens leave for the customers."

# ── Interfaces on this subsystem's boundary ──────────────────────────
component "Frontier pool" primitive Splitting interface
    description "Frontier serving's pool: divides routed frontier workload across the frontier models by their routed shares."
interface "Frontier release"
    description "Where closed weights and API access enter this subsystem: the parent's interface of the same name, refined to the four models it serves."
interface "Frontier endpoint"
    description "Where the frontier models' tokens gather before leaving for the parent's serving endpoint."

# ── The served models, each an Amplifying serving process ────────────
component Opus primitive Amplifying
    description "A served model: released weights and allocated compute in, tokens out."
component Fable primitive Amplifying
    description "A served model: released weights and allocated compute in, tokens out."
component GPT primitive Amplifying
    description "A served model: released weights and allocated compute in, tokens out."
component Gemini primitive Amplifying
    description "A served model: released weights and allocated compute in, tokens out."

# ── Workload in: the parent's realized routed frontier flow ──────────
flow Router -> "Frontier pool" : energy "routed frontier workload" substance compute amount 2359.55 unit "Gtok/day"
    description "The routed frontier workload the parent's router sends this subsystem."
    grounding asserted "6000 × 35/89 = 2359.55 Gtok/day, the parent's realized flow; the 6000 and the 35/89 are third-party (Dirac digest of OpenRouter rankings, June–July 2026)"

# ── Weights in: ample, through the release interface ─────────────────
flow "Frontier labs" -> "Frontier release" : informational "closed weights & API" substance weights ample
    description "Closed weights and API access passing into this subsystem."
flow "Frontier release" -> Opus : informational "closed weights & API" substance weights ample
    description "API access into Opus."
flow "Frontier release" -> Fable : informational "closed weights & API" substance weights ample
    description "API access into Fable."
flow "Frontier release" -> GPT : informational "closed weights & API" substance weights ample
    description "API access into GPT."
flow "Frontier release" -> Gemini : informational "closed weights & API" substance weights ample
    description "API access into Gemini."

# ── Frontier pool: routed shares among the frontier models ───────────
# Sources disagree on Anthropic's share (12–24%); the midpoint is taken.
flow "Frontier pool" -> Opus : energy "routed serving share" substance compute amount 9 unit "Gtok/day"
    description "Opus's share of routed frontier workload."
    grounding third-party "stockalarm and tech-insider digests of OpenRouter, June–July 2026; Anthropic 12–24%, midpoint"
flow "Frontier pool" -> Fable : energy "routed serving share" substance compute amount 6 unit "Gtok/day"
    description "Fable's share of routed frontier workload."
    grounding third-party "same digests; in-lab split estimated"
flow "Frontier pool" -> GPT : energy "routed serving share" substance compute amount 9 unit "Gtok/day"
    description "GPT's share of routed frontier workload."
    grounding third-party "same digests"
flow "Frontier pool" -> Gemini : energy "routed serving share" substance compute amount 11 unit "Gtok/day"
    description "Gemini's share of routed frontier workload."
    grounding third-party "same digests"

# ── Served output: information delivered, compute already spent ──────
flow Opus -> "Frontier endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Opus."
flow Fable -> "Frontier endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Fable."
flow GPT -> "Frontier endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by GPT."
flow Gemini -> "Frontier endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Gemini."
flow "Frontier endpoint" -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "The frontier models' tokens leaving for the parent's serving endpoint."

# ── Declared parameters and metrics ──────────────────────────────────
param "Routed frontier workload" : flow Router -> "Frontier pool" "routed frontier workload" range 0..12000
param shares "Frontier models, routed" : from "Frontier pool"

metric "Opus share of routed frontier" : share of flow "Frontier pool" -> Opus "routed serving share"
metric "Fable share of routed frontier" : share of flow "Frontier pool" -> Fable "routed serving share"
metric "GPT share of routed frontier" : share of flow "Frontier pool" -> GPT "routed serving share"
metric "Gemini share of routed frontier" : share of flow "Frontier pool" -> Gemini "routed serving share"
metric "Opus tokens served" : sum into Opus
metric "Gemini tokens served" : sum into Gemini

@lens mobus
