# ── Open-weight serving, one level down ──────────────────────────────
# The child of the "Open-weight serving" component in
# ../../examples/llm-market.sl (the LLM serving market at pool grain,
# 2026-10-10). The parent treats open-weight serving as one Amplifying
# process; this model is its interior: the five open models behind a
# pool that divides routed open-weight workload by the shares a router
# reports, and the self-hosted interface that divides self-hosted
# workload across the same five, since only open weights can be
# self-hosted. The roster, its shares and its groundings are carried
# here from the flat model (../../archive/llm-market-flat.sl) unchanged.
#
# The environment stand-ins are the seam's other half, the parent's
# neighbours of the decomposed component name for name, so the kernel's
# boundary contract (bert-core::decomposition) holds. Router sends the
# routed workload across the interior; the parent's Self-hosting and
# Open-weight release pass-ways fuse onto the subsystem at projection
# (#226), so the self-hosted workload and the weights cross the seam
# from Self-hosted demand and Open-weight labs themselves, and this
# model's interfaces of the same names are those ports, refined. Serving
# endpoint takes the tokens.
#
# A run is per level. The Router stand-in's amount is the parent's
# realized flow, 6000 Gtok/day routed × 54/89, declared to two decimals
# with a grounding that says so, and the self-hosted stand-in carries
# the parent's placeholder through; a knob turned at the parent does not
# move this model until single-run substitution exists.
system "Open-weight serving" : Concrete/Social
domain "Routed and self-hosted open-weight workload divided across Gemma, Llama, Qwen, DeepSeek and the open field by share, tokens served out, compute shed as heat"
time unit day

level Structure

# ── E′: the parent's neighbours ──────────────────────────────────────
source Router
    description "The parent's routed interface, standing in for the routed open-weight workload it sends this subsystem."
    grounding asserted "the parent's realized flow: 6000 Gtok/day routed × 54/89 (Router → Open-weight serving in ../../examples/llm-market.sl); recompute when the parent changes"
source "Self-hosted demand"
    description "Customers who run open weights on their own hardware; the crossing counterparty once the parent's Self-hosting pass-way fuses onto this subsystem."
    grounding unknown "no public sensor counts self-hosted serving; the amount below is the parent's placeholder, carried through"
source "Open-weight labs"
    description "Meta, Alibaba, DeepSeek, Google (Gemma) and the open-weight field as research arms, the parent's source of open weights; the crossing counterparty once the parent's Open-weight release pass-way fuses onto this subsystem."
sink "Serving endpoint"
    description "The parent's serving endpoint, where this subsystem's tokens leave for the customers."

# ── Interfaces on this subsystem's boundary ──────────────────────────
component "Open-weight pool" primitive Splitting interface
    description "Open-weight serving's pool: divides routed open-weight workload across the open models by their routed shares."
component Self-hosting primitive Splitting interface
    description "The self-hosted interface, refined: divides self-hosted workload across the open models. Closed weights cannot be self-hosted, so nothing here reaches a frontier model."
    grounding asserted "split assumed to follow the routed open-weight split until a sensor says otherwise"
interface "Open-weight release"
    description "Where open weights enter this subsystem: the parent's interface of the same name, refined to the five models it serves."
interface "Open endpoint"
    description "Where the open models' tokens gather before leaving for the parent's serving endpoint."

# ── The served models, each an Amplifying serving process ────────────
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

# ── Workload in: the parent's realized flows ─────────────────────────
flow Router -> "Open-weight pool" : energy "routed open-weight workload" substance compute amount 3640.45 unit "Gtok/day"
    description "The routed open-weight workload the parent's router sends this subsystem."
    grounding asserted "6000 × 54/89 = 3640.45 Gtok/day, the parent's realized flow; the 6000 and the 54/89 are third-party (Dirac digest of OpenRouter rankings, June–July 2026)"
flow "Self-hosted demand" -> Self-hosting : energy "self-hosted workload" substance compute amount 3000 unit "Gtok/day"
    description "The self-hosted workload entering the self-hosted interface as inference compute."
    grounding unknown "the parent's placeholder, a round half of the routed figure; no sensor; replace before any finding quotes it"

# ── Weights in: ample ────────────────────────────────────────────────
flow "Open-weight labs" -> "Open-weight release" : informational "open weights" substance weights ample
    description "Open weights passing into this subsystem."
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
flow Self-hosting -> Gemma : energy "self-hosted serving share" substance compute amount 2 unit "Gtok/day"
    description "Gemma's share of self-hosted workload."
    grounding asserted "mirrors the routed open split; no sensor"
flow Self-hosting -> Llama : energy "self-hosted serving share" substance compute amount 3 unit "Gtok/day"
    description "Llama's share of self-hosted workload."
    grounding asserted "mirrors the routed open split; no sensor"
flow Self-hosting -> Qwen : energy "self-hosted serving share" substance compute amount 13 unit "Gtok/day"
    description "Qwen's share of self-hosted workload."
    grounding asserted "mirrors the routed open split; no sensor"
flow Self-hosting -> DeepSeek : energy "self-hosted serving share" substance compute amount 16 unit "Gtok/day"
    description "DeepSeek's share of self-hosted workload."
    grounding asserted "mirrors the routed open split; no sensor"
flow Self-hosting -> "Other open" : energy "self-hosted serving share" substance compute amount 20 unit "Gtok/day"
    description "The rest of the field's share of self-hosted workload."
    grounding asserted "mirrors the routed open split; no sensor"

# ── Served output: information delivered, compute already spent ──────
flow Gemma -> "Open endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Gemma."
flow Llama -> "Open endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Llama."
flow Qwen -> "Open endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Qwen."
flow DeepSeek -> "Open endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by DeepSeek."
flow "Other open" -> "Open endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by the rest of the field."
flow "Open endpoint" -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "The open models' tokens leaving for the parent's serving endpoint."

# ── Declared parameters and metrics ──────────────────────────────────
param "Routed open-weight workload" : flow Router -> "Open-weight pool" "routed open-weight workload" range 0..12000
param "Self-hosted workload" : flow "Self-hosted demand" -> Self-hosting "self-hosted workload" range 0..12000
param shares "Open-weight models, routed" : from "Open-weight pool"
param shares "Open-weight models, self-hosted" : from Self-hosting

metric "DeepSeek share of routed open" : share of flow "Open-weight pool" -> DeepSeek "routed serving share"
metric "Qwen share of routed open" : share of flow "Open-weight pool" -> Qwen "routed serving share"
metric "Other open share of routed open" : share of flow "Open-weight pool" -> "Other open" "routed serving share"
metric "DeepSeek tokens served" : sum into DeepSeek
metric "Qwen tokens served" : sum into Qwen
metric "Other open tokens served" : sum into "Other open"

@lens mobus
