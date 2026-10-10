# ── The LLM serving market, Mobus lens ──────────────────────────────
# Level-0 identification (2026-10-10, Mobus ch. 6 §6.5), replacing the
# two-channel model now in ../archive/llm-market-channels.sl.
#
# What the system does: it serves tokens. Compute is spent, weights are
# read, tokens leave for the customers who asked for them, and the
# entire compute feed is shed as heat. That is the system's purpose,
# whatever anyone hopes to learn from it.
#
# What the analyst asks: are LLMs becoming commodities — buyers
# indifferent to which model serves them, price pulled toward the cost
# of serving, share following price — and is open-weight serving the
# mechanism. The model does not answer that. It carries the boundary
# the question is measured on, so the observatory (the data seam, the
# prediction ledger) can.
#
# Start with the output (§6.5.1.2). The product is served tokens, and it
# leaves through two interfaces that differ in what a sensor can see:
#   Router        — customers reaching models through a router such as
#                   OpenRouter; every flow has a count and a price.
#   Self-hosting  — customers running open weights on their own
#                   hardware; no public count exists. The flow is in
#                   the model with a placeholder amount and a grounding
#                   of `unknown`, because cutting the boundary to what
#                   the router sees would bias the open-weight share low
#                   on exactly the flow the question is about. Only
#                   open weights can be self-hosted; the structure says
#                   so (the Self-hosting interface reaches no frontier
#                   model).
# Every finding quotes the grounding: third-party on the routed
# interface, unknown on the self-hosted one, until a sensor exists.
#
# Around the boundary (§6.5.2), the inputs:
#   compute — the conserved backbone. A token served is compute spent,
#             so throughput is a work unit (Gtok/day, like kWh) and the
#             rivalry that makes this a market lives here.
#   weights — information from the labs. They copy freely, so the flow
#             is `ample`: never the binding constraint, compute is.
# A frontier lab appears twice, on purpose: its research arm is outside
# (a source releasing weights or API access), its serving arm is inside
# (a serving process like any open-weight host). Price is set by the
# serving arm at the interface. The money counter-flow is not drawn;
# price enters through the observatory's data, not the engine, until the
# money plane is a word (see ../examples/federal-reserve.sl).
#
# Minimal subsystems, one level down: the two interfaces, two pools
# (frontier serving, open-weight serving) and the served models. The
# pools are where the next decomposition goes (`decomposes`, spec §4.6):
# a model's serving arm is itself a system of hosts, and the per-model
# grain here is the first cut, not the last.
system "LLM Serving Market" : Concrete/Social
domain "Inference compute cleared across frontier and open-weight models through a routed interface and a self-hosted one, tokens served out, heat shed"
time unit day

level Structure

# ── Sources: the customers, by interface ─────────────────────────────
source "Routed demand"
    description "Customers who reach models through a router: the inference compute their requests mobilize."
    grounding third-party "OpenRouter rankings via the Dirac labs-market-share digest, June–July 2026: ≈6 Ttok/day routed"
source "Self-hosted demand"
    description "Customers who run open weights on their own hardware: the inference compute they spend themselves."
    grounding unknown "no public sensor counts self-hosted serving; the amount below is a placeholder to be replaced by a measured series"

# ── Sources: the labs' research arms, releasing weights ──────────────
source "Frontier labs"
    description "Anthropic, OpenAI and Google as research arms: they release closed weights behind an API."
source "Open-weight labs"
    description "Meta, Alibaba, DeepSeek, Google (Gemma) and the open-weight field as research arms: they release weights that copy freely."

# ── Sink: where the product lands ────────────────────────────────────
sink Customers
    description "Where served tokens land, routed and self-hosted alike."

# ── Interfaces on the boundary ───────────────────────────────────────
component Router primitive Splitting interface
    description "The routed interface: splits the routed workload between frontier and open-weight serving by the shares a router reports."
    grounding third-party "open-weight ≈60% of routed volume (Dirac digest of OpenRouter rankings, June–July 2026)"
component "Self-hosting" primitive Splitting interface
    description "The self-hosted interface: splits self-hosted workload across open-weight models only. Closed weights cannot be self-hosted."
    grounding asserted "split assumed to follow the routed open-weight split until a sensor says otherwise"
interface "Frontier release"
    description "Where closed weights and API access enter serving."
interface "Open-weight release"
    description "Where open weights enter serving."
interface "Serving endpoint"
    description "Where every model's tokens leave for the customers. One pass-way: the routed and self-hosted split is read on the demand side, where the sensors are."

# ── Pools: the two serving subsystems ────────────────────────────────
component "Frontier pool" primitive Splitting
    description "Frontier serving: divides routed frontier workload across the frontier models by their routed shares."
component "Open-weight pool" primitive Splitting
    description "Open-weight serving: divides routed open-weight workload across the open models by their routed shares."

# ── The served models, each an Amplifying serving process ────────────
component Opus primitive Amplifying
    description "A served model: released weights and allocated compute in, tokens out."
component Fable primitive Amplifying
    description "A served model: released weights and allocated compute in, tokens out."
component GPT primitive Amplifying
    description "A served model: released weights and allocated compute in, tokens out."
component Gemini primitive Amplifying
    description "A served model: released weights and allocated compute in, tokens out."
component Gemma primitive Amplifying
    description "A served model: open weights and allocated compute in, tokens out."
component Llama primitive Amplifying
    description "A served model: open weights and allocated compute in, tokens out."
component Qwen primitive Amplifying
    description "A served model: open weights and allocated compute in, tokens out."
component DeepSeek primitive Amplifying
    description "A served model: open weights and allocated compute in, tokens out."
component "Other open" primitive Amplifying
    description "The open-weight field beyond the named models, served as one aggregate."

# ── Workload in, by interface ────────────────────────────────────────
flow "Routed demand" -> Router : energy "routed workload" substance compute amount 6000 unit "Gtok/day"
    description "The routed workload entering the router as inference compute."
    grounding third-party "≈6 Ttok/day (OpenRouter via Dirac, June–July 2026)"
flow "Self-hosted demand" -> "Self-hosting" : energy "self-hosted workload" substance compute amount 3000 unit "Gtok/day"
    description "The self-hosted workload entering the self-hosted interface as inference compute."
    grounding unknown "placeholder, a round half of the routed figure; no sensor; replace before any finding quotes it"

# ── Weights in: ample, from the research arms ────────────────────────
flow "Frontier labs" -> "Frontier release" : informational "closed weights & API" substance weights ample
    description "Closed weights and API access passing into serving."
flow "Open-weight labs" -> "Open-weight release" : informational "open weights" substance weights ample
    description "Open weights passing into serving."
flow "Frontier release" -> Opus : informational "closed weights & API" substance weights ample
    description "API access into Opus."
flow "Frontier release" -> Fable : informational "closed weights & API" substance weights ample
    description "API access into Fable."
flow "Frontier release" -> GPT : informational "closed weights & API" substance weights ample
    description "API access into GPT."
flow "Frontier release" -> Gemini : informational "closed weights & API" substance weights ample
    description "API access into Gemini."
flow "Open-weight release" -> Gemma : informational "open weights" substance weights ample
    description "Open weights into Gemma."
flow "Open-weight release" -> Llama : informational "open weights" substance weights ample
    description "Open weights into Llama."
flow "Open-weight release" -> Qwen : informational "open weights" substance weights ample
    description "Open weights into Qwen."
flow "Open-weight release" -> DeepSeek : informational "open weights" substance weights ample
    description "Open weights into DeepSeek."
flow "Open-weight release" -> "Other open" : informational "open weights" substance weights ample
    description "Open weights into the rest of the field."

# ── The router's split: frontier against open weight ─────────────────
# Relative weights, the routed shares of June–July 2026 summed by pool
# (frontier 9+6+9+11, open 2+3+13+16+20); they need not sum to 100.
flow Router -> "Frontier pool" : energy "routed frontier workload" substance compute amount 35 unit "Gtok/day"
    description "The routed workload the router sends to frontier serving."
    grounding third-party "Dirac digest of OpenRouter rankings, June–July 2026, summed over the frontier roster"
flow Router -> "Open-weight pool" : energy "routed open-weight workload" substance compute amount 54 unit "Gtok/day"
    description "The routed workload the router sends to open-weight serving."
    grounding third-party "Dirac digest of OpenRouter rankings, June–July 2026, summed over the open roster"

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

# ── Open-weight pool: routed shares among the open models ────────────
flow "Open-weight pool" -> Gemma : energy "routed serving share" substance compute amount 2 unit "Gtok/day"
    description "Gemma's share of routed open-weight workload."
    grounding third-party "Dirac digest of OpenRouter rankings, June–July 2026"
flow "Open-weight pool" -> Llama : energy "routed serving share" substance compute amount 3 unit "Gtok/day"
    description "Llama's share of routed open-weight workload."
    grounding third-party "same digest"
flow "Open-weight pool" -> Qwen : energy "routed serving share" substance compute amount 13 unit "Gtok/day"
    description "Qwen's share of routed open-weight workload."
    grounding third-party "same digest"
flow "Open-weight pool" -> DeepSeek : energy "routed serving share" substance compute amount 16 unit "Gtok/day"
    description "DeepSeek's share of routed open-weight workload."
    grounding third-party "same digest; DeepSeek ≈16%"
flow "Open-weight pool" -> "Other open" : energy "routed serving share" substance compute amount 20 unit "Gtok/day"
    description "The rest of the field's share of routed open-weight workload."
    grounding third-party "same digest; the long tail folded by the model's own structure"

# ── Self-hosting: open weights only, split assumed to follow routed ──
flow "Self-hosting" -> Gemma : energy "self-hosted serving share" substance compute amount 2 unit "Gtok/day"
    description "Gemma's share of self-hosted workload."
    grounding asserted "mirrors the routed open split; no sensor"
flow "Self-hosting" -> Llama : energy "self-hosted serving share" substance compute amount 3 unit "Gtok/day"
    description "Llama's share of self-hosted workload."
    grounding asserted "mirrors the routed open split; no sensor"
flow "Self-hosting" -> Qwen : energy "self-hosted serving share" substance compute amount 13 unit "Gtok/day"
    description "Qwen's share of self-hosted workload."
    grounding asserted "mirrors the routed open split; no sensor"
flow "Self-hosting" -> DeepSeek : energy "self-hosted serving share" substance compute amount 16 unit "Gtok/day"
    description "DeepSeek's share of self-hosted workload."
    grounding asserted "mirrors the routed open split; no sensor"
flow "Self-hosting" -> "Other open" : energy "self-hosted serving share" substance compute amount 20 unit "Gtok/day"
    description "The rest of the field's share of self-hosted workload."
    grounding asserted "mirrors the routed open split; no sensor"

# ── Served output: information delivered, compute already spent ──────
# Token output is a message: it lands and is never ledgered. The ledger
# shows every Gtok/day of compute dissipating as heat, which is what a
# GPU does. Share is read off each model's activity in the trace.
flow Opus -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Opus arriving at the endpoint."
flow Fable -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Fable arriving at the endpoint."
flow GPT -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by GPT arriving at the endpoint."
flow Gemini -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Gemini arriving at the endpoint."
flow Gemma -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Gemma arriving at the endpoint."
flow Llama -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Llama arriving at the endpoint."
flow Qwen -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Qwen arriving at the endpoint."
flow DeepSeek -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by DeepSeek arriving at the endpoint."
flow "Other open" -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by the rest of the field arriving at the endpoint."
flow "Serving endpoint" -> Customers : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens leaving the endpoint for the customers."

# ── Declared parameters: the knobs, in market words ──────────────────
# Price is absent on purpose: it needs the money counter-flow this
# model does not draw. It enters through the observatory's data.
param "Routed workload" : flow "Routed demand" -> Router "routed workload" range 0..12000
param "Self-hosted workload" : flow "Self-hosted demand" -> "Self-hosting" "self-hosted workload" range 0..12000
param shares "Routed split, frontier against open weight" : from Router
param shares "Frontier models, routed" : from "Frontier pool"
param shares "Open-weight models, routed" : from "Open-weight pool"
param shares "Open-weight models, self-hosted" : from "Self-hosting"

# ── Declared metrics: the readouts the question is measured on ───────
# The first two are the hypothesis's own variable. The per-model shares
# are the leaderboard reading. Tokens served are the totals across both
# interfaces, which is the only place the self-hosted flow adds to a
# frontier-against-open comparison.
metric "Open-weight share, routed" : share of flow Router -> "Open-weight pool" "routed open-weight workload"
metric "Frontier share, routed" : share of flow Router -> "Frontier pool" "routed frontier workload"
metric "Opus share of routed frontier" : share of flow "Frontier pool" -> Opus "routed serving share"
metric "Fable share of routed frontier" : share of flow "Frontier pool" -> Fable "routed serving share"
metric "GPT share of routed frontier" : share of flow "Frontier pool" -> GPT "routed serving share"
metric "Gemini share of routed frontier" : share of flow "Frontier pool" -> Gemini "routed serving share"
metric "DeepSeek share of routed open" : share of flow "Open-weight pool" -> DeepSeek "routed serving share"
metric "Qwen share of routed open" : share of flow "Open-weight pool" -> Qwen "routed serving share"
metric "Other open share of routed open" : share of flow "Open-weight pool" -> "Other open" "routed serving share"
metric "Opus tokens served" : sum into Opus
metric "Gemini tokens served" : sum into Gemini
metric "DeepSeek tokens served" : sum into DeepSeek
metric "Qwen tokens served" : sum into Qwen
metric "Other open tokens served" : sum into "Other open"

@lens mobus
