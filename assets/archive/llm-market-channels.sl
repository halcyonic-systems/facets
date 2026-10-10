# ── The LLM market as a serving fabric, Mobus lens ───────────────────
# First-principles restructure (2026-07-28). The previous version drew
# only the information layer — labs releasing capacity, models splitting
# "token supply" across channels — and the engine refused to run it,
# correctly: tokens are information, information copies, and you cannot
# clear (divide, conserve) what copies freely. The rivalry that makes
# this a MARKET lives in the layer that model omitted: compute. A token
# served is compute spent. So the conserved backbone here is inference
# compute (an energy kind, measured in Gtok/day of serving work — token
# throughput is a work unit, like kWh), and the model output is what it
# really is: information, powered by metered energy, shed as heat.
#
# Each model is an Amplifying work process — Mobus's signal + power
# primitive: released weights (information — they DO copy freely, the
# old typing was right about that) plus allocated compute in; served
# tokens out; the entire compute feed dissipated as waste heat. That is
# not a metaphor. It is what a GPU does.
#
# The two demand channels stay separate because measured reality
# disagrees between them: open-weight models carry roughly a third of
# developer-channel token volume but only about a tenth of enterprise
# workload. Averaging them erases the market's main structural fact.

system "LLM Market" : Concrete/Social

domain "Inference compute cleared across frontier and open-weight models by two demand channels, tokens served out, heat shed"

time unit day

# Declared amounts feed a run, but the stepping that generates the series is
# the engine's, not this file's — meaning once, mechanics machine. The
# complete generating rule is not authored here (ratified 2026-08-08, #288).
level Structure

# ── Sources: demand-side workload, the compute each channel mobilizes ─
# The observatory's measured inputs. Developer workload is the
# API-routed slice a router like OpenRouter actually sees (~6 Ttok/day
# mid-2026); self-hosted serving is invisible to that sensor — a real
# observability gap this model inherits from its data source, not a
# modeling choice. Enterprise workload is DERIVED from spend surveys at
# premium prices; treat its absolute level as a rough estimate.
source "Developer workload"
    description "The developer demand channel: the inference compute that API and developer users mobilize."
source "Enterprise workload"
    description "The enterprise demand channel: the inference compute that enterprise users mobilize."

# ── Sources: the labs, releasing weights and API access ──────────────
# Correctly informational in the old model and still informational
# here: a released model copies freely to every server that runs it.
# The lab's role in THIS system ends at release; training compute is a
# different system's flow.
source Anthropic
    description "The lab that releases Opus and Fable."
source OpenAI
    description "The lab that releases GPT."
source Google
    description "The lab that releases Gemini and Gemma."
source Meta
    description "The lab that releases Llama."
source Alibaba
    description "The lab that releases Qwen."
source "DeepSeek (lab)"
    description "The lab that releases DeepSeek."
source "Open-weight field"
    description "The rest of the open-weight field, which releases models other than the named ones."

# ── Composition: the two clearing processes ──────────────────────────
# The market mechanism itself: each channel's workload is one compute
# inflow, divided across the models by their observed market share —
# Splitting with relative weights on the outwires (Mobus Eq. 4.5).
# This is what the old Combining "channels" wanted to be: a market
# clears rival capacity, it does not merge copies of information.
component "Developer clearing" primitive Splitting interface
    description "Splits the developer workload across the models by declared shares."
component "Enterprise clearing" primitive Splitting interface
    description "Splits the enterprise workload across the models by declared shares."

# ── Composition: the models, each an Amplifying serving process ──────
# Signal (weights) + power (compute) in, tokens out, heat shed. Nine
# processes: eight named models plus an aggregate for the open-weight
# field (GLM, Kimi, Mistral and the rest) that mid-2026 data shows
# carrying too much developer volume to omit.
component Opus primitive Amplifying
    description "A served model: it takes released weights and allocated compute in and serves tokens out."
component Fable primitive Amplifying
    description "A served model: it takes released weights and allocated compute in and serves tokens out."
component GPT primitive Amplifying
    description "A served model: it takes released weights and allocated compute in and serves tokens out."
component Gemini primitive Amplifying
    description "A served model: it takes released weights and allocated compute in and serves tokens out."
component Gemma primitive Amplifying
    description "A served model: it takes released weights and allocated compute in and serves tokens out."
component Llama primitive Amplifying
    description "A served model: it takes released weights and allocated compute in and serves tokens out."
component Qwen primitive Amplifying
    description "A served model: it takes released weights and allocated compute in and serves tokens out."
component DeepSeek primitive Amplifying
    description "A served model: it takes released weights and allocated compute in and serves tokens out."
component "Other open" primitive Amplifying
    description "An aggregate served model standing for the open-weight field beyond the named models."

# ── Environment: where served tokens land ────────────────────────────
sink "Applications served"
    description "Where served tokens land: the applications that receive what the models serve."

# The boundary objects (#472, #493): each lab's release channel — where its
# weights and API access enter — and the one serving endpoint where every
# model's tokens leave for the applications. Pass-ways alter nothing; the
# models behind them amplify.
interface "Anthropic release channel"
    description "Where Anthropic's weights and API access enter the market."
interface "OpenAI release channel"
    description "Where OpenAI's weights and API access enter the market."
interface "Google release channel"
    description "Where Google's weights and API access enter the market."
interface "Meta release channel"
    description "Where Meta's weights and API access enter the market."
interface "Alibaba release channel"
    description "Where Alibaba's weights and API access enter the market."
interface "DeepSeek (lab) release channel"
    description "Where DeepSeek (lab)'s weights and API access enter the market."
interface "Open-weight field release channel"
    description "Where Open-weight field's weights and API access enter the market."
interface "Serving endpoint"
    description "The one endpoint where every model's tokens leave for the applications."

# ── Driving flows: the two workloads, forced from data ───────────────
# Absolute levels, Gtok/day. Developer ≈ 6,000 (OpenRouter-observed,
# June 2026, ~6T tokens/day). Enterprise ≈ 2,000 (spend-derived
# estimate — the weakest number here, flagged for replacement).
flow "Developer workload" -> "Developer clearing" : energy "dev inference compute" substance compute amount 6000 unit "Gtok/day"
    description "The developer workload entering its clearing as inference compute."
flow "Enterprise workload" -> "Enterprise clearing" : energy "enterprise inference compute" substance compute amount 2000 unit "Gtok/day"
    description "The enterprise workload entering its clearing as inference compute."

# ── Weights signals: ample, and now the grammar can say so ───────────
# Amplifying emits min(signal × gain, power): with the signal ample the
# min always selects power, so each model's token output tracks its
# metered compute exactly — availability of weights is never the
# binding constraint in this market; compute allocation is. This used
# to be said with `amount 100000 unit avail/day`, a magic number the
# diagram then displayed; `ample` (#9) is that engineering fact as a
# word, and the engine holds the equivalence.
flow Anthropic -> "Anthropic release channel" : informational "released weights & API" substance weights ample
    description "Anthropic's released weights and API access passing into its release channel."
flow "Anthropic release channel" -> Opus : informational "released weights & API" substance weights ample
    description "Weights and API access passing from the channel into Opus."
flow "Anthropic release channel" -> Fable : informational "released weights & API" substance weights ample
    description "Weights and API access passing from the channel into Fable."
flow OpenAI -> "OpenAI release channel" : informational "released weights & API" substance weights ample
    description "OpenAI's released weights and API access passing into its release channel."
flow "OpenAI release channel" -> GPT : informational "released weights & API" substance weights ample
    description "Weights and API access passing from the channel into GPT."
flow Google -> "Google release channel" : informational "released weights & API" substance weights ample
    description "Google's released weights and API access passing into its release channel."
flow "Google release channel" -> Gemini : informational "released weights & API" substance weights ample
    description "Weights and API access passing from the channel into Gemini."
flow "Google release channel" -> Gemma : informational "released weights & API" substance weights ample
    description "Weights and API access passing from the channel into Gemma."
flow Meta -> "Meta release channel" : informational "released weights & API" substance weights ample
    description "Meta's released weights and API access passing into its release channel."
flow "Meta release channel" -> Llama : informational "released weights & API" substance weights ample
    description "Weights and API access passing from the channel into Llama."
flow Alibaba -> "Alibaba release channel" : informational "released weights & API" substance weights ample
    description "Alibaba's released weights and API access passing into its release channel."
flow "Alibaba release channel" -> Qwen : informational "released weights & API" substance weights ample
    description "Weights and API access passing from the channel into Qwen."
flow "DeepSeek (lab)" -> "DeepSeek (lab) release channel" : informational "released weights & API" substance weights ample
    description "DeepSeek (lab)'s released weights and API access passing into its release channel."
flow "DeepSeek (lab) release channel" -> DeepSeek : informational "released weights & API" substance weights ample
    description "Weights and API access passing from the channel into DeepSeek."
flow "Open-weight field" -> "Open-weight field release channel" : informational "released weights & API" substance weights ample
    description "Open-weight field's released weights and API access passing into its release channel."
flow "Open-weight field release channel" -> "Other open" : informational "released weights & API" substance weights ample
    description "Weights and API access passing from the channel into Other open."

# ── Developer clearing: relative weights = observed dev-channel share ─
# Calibration, June–July 2026, renormalized to this roster. Sources:
# OpenRouter rankings via Dirac labs-market-share (≈6 Ttok/day, OSS
# ≈60% of routed volume) and stockalarm/tech-insider digests (DeepSeek
# ≈16%, Anthropic 12–24% — sources disagree; midpoint taken). Weights
# are relative, so they need not sum to 100.
flow "Developer clearing" -> Opus : energy "dev serving share" substance compute amount 9 unit "Gtok/day"
    description "The share of the developer workload the clearing allocates to Opus."
flow "Developer clearing" -> Fable : energy "dev serving share" substance compute amount 6 unit "Gtok/day"
    description "The share of the developer workload the clearing allocates to Fable."
flow "Developer clearing" -> GPT : energy "dev serving share" substance compute amount 9 unit "Gtok/day"
    description "The share of the developer workload the clearing allocates to GPT."
flow "Developer clearing" -> Gemini : energy "dev serving share" substance compute amount 11 unit "Gtok/day"
    description "The share of the developer workload the clearing allocates to Gemini."
flow "Developer clearing" -> Gemma : energy "dev serving share" substance compute amount 2 unit "Gtok/day"
    description "The share of the developer workload the clearing allocates to Gemma."
flow "Developer clearing" -> Llama : energy "dev serving share" substance compute amount 3 unit "Gtok/day"
    description "The share of the developer workload the clearing allocates to Llama."
flow "Developer clearing" -> Qwen : energy "dev serving share" substance compute amount 13 unit "Gtok/day"
    description "The share of the developer workload the clearing allocates to Qwen."
flow "Developer clearing" -> DeepSeek : energy "dev serving share" substance compute amount 16 unit "Gtok/day"
    description "The share of the developer workload the clearing allocates to DeepSeek."
flow "Developer clearing" -> "Other open" : energy "dev serving share" substance compute amount 20 unit "Gtok/day"
    description "The share of the developer workload the clearing allocates to Other open."

# ── Enterprise clearing: relative weights = spend share as workload proxy ─
# Menlo Ventures enterprise LLM API survey (2025→2026): Anthropic 40%
# (split Opus 30 / Fable 10, in-lab split estimated), OpenAI 27%,
# Google 21% (Gemini 20 / Gemma 1), open-weight roughly a tenth of
# enterprise workload (Vercel AI Gateway: <4% of SPEND — spend
# understates workload at one-tenth prices). Spend-as-workload is a
# proxy with known bias; replace when a workload series exists.
flow "Enterprise clearing" -> Opus : energy "enterprise serving share" substance compute amount 30 unit "Gtok/day"
    description "The share of the enterprise workload the clearing allocates to Opus."
flow "Enterprise clearing" -> Fable : energy "enterprise serving share" substance compute amount 10 unit "Gtok/day"
    description "The share of the enterprise workload the clearing allocates to Fable."
flow "Enterprise clearing" -> GPT : energy "enterprise serving share" substance compute amount 27 unit "Gtok/day"
    description "The share of the enterprise workload the clearing allocates to GPT."
flow "Enterprise clearing" -> Gemini : energy "enterprise serving share" substance compute amount 20 unit "Gtok/day"
    description "The share of the enterprise workload the clearing allocates to Gemini."
flow "Enterprise clearing" -> Gemma : energy "enterprise serving share" substance compute amount 1 unit "Gtok/day"
    description "The share of the enterprise workload the clearing allocates to Gemma."
flow "Enterprise clearing" -> Llama : energy "enterprise serving share" substance compute amount 4 unit "Gtok/day"
    description "The share of the enterprise workload the clearing allocates to Llama."
flow "Enterprise clearing" -> Qwen : energy "enterprise serving share" substance compute amount 3 unit "Gtok/day"
    description "The share of the enterprise workload the clearing allocates to Qwen."
flow "Enterprise clearing" -> DeepSeek : energy "enterprise serving share" substance compute amount 3 unit "Gtok/day"
    description "The share of the enterprise workload the clearing allocates to DeepSeek."
flow "Enterprise clearing" -> "Other open" : energy "enterprise serving share" substance compute amount 2 unit "Gtok/day"
    description "The share of the enterprise workload the clearing allocates to Other open."

# ── Served output: information delivered, compute already spent ──────
# Token output is Message — it lands, it is never ledgered; the ledger
# instead shows every Gtok/day of compute dissipating as heat, which is
# the thermodynamic truth of inference. Market share is read off each
# model's activity in the trace.
flow Opus -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Opus arriving at the serving endpoint."
flow Fable -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Fable arriving at the serving endpoint."
flow GPT -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by GPT arriving at the serving endpoint."
flow Gemini -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Gemini arriving at the serving endpoint."
flow Gemma -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Gemma arriving at the serving endpoint."
flow Llama -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Llama arriving at the serving endpoint."
flow Qwen -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Qwen arriving at the serving endpoint."
flow DeepSeek -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by DeepSeek arriving at the serving endpoint."
flow "Other open" -> "Serving endpoint" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens served by Other open arriving at the serving endpoint."
flow "Serving endpoint" -> "Applications served" : informational "tokens served" substance tokens unit "Gtok/day"
    description "Tokens leaving the endpoint to the applications that receive them."

# ── Declared parameters: the model's own vocabulary for its knobs ────
# What a user of this simulation actually wants to slide (walkthrough
# #18): channel demand and market shares, not "relative weights". Each
# param names an amount declared above; the % presentation of a shares
# group is display-only — the engine keeps the raw weights. Cost/price
# parameters are legitimately absent: they need the money counter-flow
# plane this model deliberately defers.
param "Developer demand" : flow "Developer workload" -> "Developer clearing" "dev inference compute" range 0..12000
param "Enterprise demand" : flow "Enterprise workload" -> "Enterprise clearing" "enterprise inference compute" range 0..8000
param shares "Developer market share" : from "Developer clearing"
param shares "Enterprise market share" : from "Enterprise clearing"

# ── Declared metrics: the model's own vocabulary for its readouts ────
#
# The output twin of the params above (#203): a metric names a computed
# reading of the run, in market words. Shares are named as PRODUCED
# observables of the run — today they echo the declared split, and when
# the clearing becomes agent-chosen (#269) the same declarations read the
# endogenous result with no rewrite.
# Each share family asks ONE question of several models (the leaderboard
# reading, drawn as one chart per clearing since #341): the four largest
# servers per channel, with the long tail already folded into "Other open"
# by the model's own structure.
metric "DeepSeek dev share" : share of flow "Developer clearing" -> DeepSeek "dev serving share"
metric "Qwen dev share" : share of flow "Developer clearing" -> Qwen "dev serving share"
metric "Gemini dev share" : share of flow "Developer clearing" -> Gemini "dev serving share"
metric "Opus dev share" : share of flow "Developer clearing" -> Opus "dev serving share"
metric "Opus enterprise share" : share of flow "Enterprise clearing" -> Opus "enterprise serving share"
metric "GPT enterprise share" : share of flow "Enterprise clearing" -> GPT "enterprise serving share"
metric "Gemini enterprise share" : share of flow "Enterprise clearing" -> Gemini "enterprise serving share"
metric "Fable enterprise share" : share of flow "Enterprise clearing" -> Fable "enterprise serving share"
metric "Opus tokens served" : sum into Opus
metric "Fable tokens served" : sum into Fable
metric "DeepSeek tokens served" : sum into DeepSeek
metric "Qwen tokens served" : sum into Qwen

@lens mobus
