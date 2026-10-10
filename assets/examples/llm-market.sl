# ── The LLM serving market, Mobus lens ──────────────────────────────
# Level-0 identification (2026-10-10, Mobus ch. 6 §6.5), replacing the
# two-channel model now in ../archive/llm-market-channels.sl. Drawn at
# pool grain since the same day: the per-model roster lives one level
# down (see "One level down" below); the flat single-level version is
# ../archive/llm-market-flat.sl.
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
#                   so (the Self-hosting interface reaches the
#                   open-weight subsystem and nothing else).
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
# Minimal subsystems, one level down: the two interfaces and two
# serving subsystems, frontier and open-weight. Each is one Amplifying
# process here, and each `decomposes` (spec §4.6) into its own model
# in ../walkthroughs/llm-market/, where the roster lives: Opus, Fable,
# GPT and Gemini behind the frontier pool; Gemma, Llama, Qwen, DeepSeek
# and the open field behind the open-weight pool. The roster is kept a
# level down because the question is asked at pool grain (open against
# frontier, by interface), and a model that reasons about inputs and
# outputs reads best with a handful of each; the children carry the
# per-model shares and groundings in full, and each reproduces the
# flat model's per-model numbers from this level's realized flows.
#
# One honest caveat about the two levels: a run is per level. A knob
# turned here (the Router's split, a workload) changes this trace and
# nothing below it; the children declare the realized flows as their
# own source amounts, so a change here is carried down by hand until
# single-run substitution exists.
system "LLM Serving Market" : Concrete/Social
domain "Inference compute cleared across frontier and open-weight serving through a routed interface and a self-hosted one, tokens served out, heat shed"
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
interface Self-hosting
    description "The self-hosted interface: passes self-hosted workload to open-weight serving only. Closed weights cannot be self-hosted."
    grounding unknown "no sensor on this interface; its workload is the placeholder declared on the flow into it"
interface "Frontier release"
    description "Where closed weights and API access enter serving."
interface "Open-weight release"
    description "Where open weights enter serving."
interface "Serving endpoint"
    description "Where every subsystem's tokens leave for the customers. One pass-way: the routed and self-hosted split is read on the demand side, where the sensors are."

# ── The two serving subsystems, each decomposed one level down ───────
component "Frontier serving" primitive Amplifying decomposes "Frontier serving" @5oJEAmzFReku6y9z8t5Ucu
    description "Frontier serving as one process: closed weights and routed frontier workload in, tokens out. Its interior, the frontier roster behind a pool, is the child model."
component "Open-weight serving" primitive Amplifying decomposes "Open-weight serving" @pWAnTptPXdKY3x38yXpLn
    description "Open-weight serving as one process: open weights, routed open-weight workload and self-hosted workload in, tokens out. Its interior, the open roster behind a pool, is the child model."

# ── Workload in, by interface ────────────────────────────────────────
flow "Routed demand" -> Router : energy "routed workload" substance compute amount 6000 unit "Gtok/day"
    description "The routed workload entering the router as inference compute."
    grounding third-party "≈6 Ttok/day (OpenRouter via Dirac, June–July 2026)"
flow "Self-hosted demand" -> Self-hosting : energy "self-hosted workload" substance compute amount 3000 unit "Gtok/day"
    description "The self-hosted workload entering the self-hosted interface as inference compute."
    grounding unknown "placeholder, a round half of the routed figure; no sensor; replace before any finding quotes it"

# ── Weights in: ample, from the research arms ────────────────────────
flow "Frontier labs" -> "Frontier release" : informational "closed weights & API" substance weights ample
    description "Closed weights and API access passing into serving."
flow "Open-weight labs" -> "Open-weight release" : informational "open weights" substance weights ample
    description "Open weights passing into serving."
flow "Frontier release" -> "Frontier serving" : informational "closed weights & API" substance weights ample
    description "API access into frontier serving."
flow "Open-weight release" -> "Open-weight serving" : informational "open weights" substance weights ample
    description "Open weights into open-weight serving."

# ── The router's split: frontier against open weight ─────────────────
# Relative weights, the routed shares of June–July 2026 summed by pool
# (frontier 9+6+9+11, open 2+3+13+16+20); they need not sum to 100.
flow Router -> "Frontier serving" : energy "routed frontier workload" substance compute amount 35 unit "Gtok/day"
    description "The routed workload the router sends to frontier serving."
    grounding third-party "Dirac digest of OpenRouter rankings, June–July 2026, summed over the frontier roster"
flow Router -> "Open-weight serving" : energy "routed open-weight workload" substance compute amount 54 unit "Gtok/day"
    description "The routed workload the router sends to open-weight serving."
    grounding third-party "Dirac digest of OpenRouter rankings, June–July 2026, summed over the open roster"

# ── Self-hosting: open weights only ──────────────────────────────────
flow Self-hosting -> "Open-weight serving" : energy "self-hosted workload" substance compute unit "Gtok/day"
    description "The self-hosted workload passing to open-weight serving, the only subsystem that can take it."
    grounding asserted "closed weights cannot be self-hosted, so the interface reaches one subsystem"

# ── Served output: information delivered, compute already spent ──────
# Token output is a message: it lands and is never ledgered. The ledger
# shows every Gtok/day of compute dissipating as heat, which is what a
# GPU does. Share is read off each subsystem's activity in the trace.
flow "Frontier serving" -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by the frontier models arriving at the endpoint."
flow "Open-weight serving" -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by the open-weight models arriving at the endpoint."
flow "Serving endpoint" -> Customers : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens leaving the endpoint for the customers."

# ── Declared parameters: the knobs, in market words ──────────────────
# Price is absent on purpose: it needs the money counter-flow this
# model does not draw. It enters through the observatory's data. The
# per-model shares are the children's knobs, declared there.
param "Routed workload" : flow "Routed demand" -> Router "routed workload" range 0..12000
param "Self-hosted workload" : flow "Self-hosted demand" -> Self-hosting "self-hosted workload" range 0..12000
param shares "Routed split, frontier against open weight" : from Router

# ── Declared metrics: the readouts the question is measured on ───────
# The first two are the hypothesis's own variable. Tokens served are
# the totals across both interfaces, which is the only place the
# self-hosted flow adds to a frontier-against-open comparison.
metric "Open-weight share, routed" : share of flow Router -> "Open-weight serving" "routed open-weight workload"
metric "Frontier share, routed" : share of flow Router -> "Frontier serving" "routed frontier workload"
metric "Frontier tokens served" : sum into "Frontier serving"
metric "Open-weight tokens served" : sum into "Open-weight serving"

@lens mobus
