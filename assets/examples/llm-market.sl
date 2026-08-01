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

# ── Sources: demand-side workload, the compute each channel mobilizes ─
# The observatory's measured inputs. Developer workload is the
# API-routed slice a router like OpenRouter actually sees (~6 Ttok/day
# mid-2026); self-hosted serving is invisible to that sensor — a real
# observability gap this model inherits from its data source, not a
# modeling choice. Enterprise workload is DERIVED from spend surveys at
# premium prices; treat its absolute level as a rough estimate.
source "Developer workload"
source "Enterprise workload"

# ── Sources: the labs, releasing weights and API access ──────────────
# Correctly informational in the old model and still informational
# here: a released model copies freely to every server that runs it.
# The lab's role in THIS system ends at release; training compute is a
# different system's flow.
source Anthropic
source OpenAI
source Google
source Meta
source Alibaba
source "DeepSeek (lab)"
source "Open-weight field"

# ── Composition: the two clearing processes ──────────────────────────
# The market mechanism itself: each channel's workload is one compute
# inflow, divided across the models by their observed market share —
# Splitting with relative weights on the outwires (Mobus Eq. 4.5).
# This is what the old Combining "channels" wanted to be: a market
# clears rival capacity, it does not merge copies of information.
component "Developer clearing" primitive Splitting interface
component "Enterprise clearing" primitive Splitting interface

# ── Composition: the models, each an Amplifying serving process ──────
# Signal (weights) + power (compute) in, tokens out, heat shed. Nine
# processes: eight named models plus an aggregate for the open-weight
# field (GLM, Kimi, Mistral and the rest) that mid-2026 data shows
# carrying too much developer volume to omit.
component Opus primitive Amplifying interface
component Fable primitive Amplifying interface
component GPT primitive Amplifying interface
component Gemini primitive Amplifying interface
component Gemma primitive Amplifying interface
component Llama primitive Amplifying interface
component Qwen primitive Amplifying interface
component DeepSeek primitive Amplifying interface
component "Other open" primitive Amplifying interface

# ── Environment: where served tokens land ────────────────────────────
sink "Applications served"

# ── Driving flows: the two workloads, forced from data ───────────────
# Absolute levels, Gtok/day. Developer ≈ 6,000 (OpenRouter-observed,
# June 2026, ~6T tokens/day). Enterprise ≈ 2,000 (spend-derived
# estimate — the weakest number here, flagged for replacement).
flow "Developer workload" -> "Developer clearing" : energy "dev inference compute" substance compute amount 6000 unit Gtok/day
flow "Enterprise workload" -> "Enterprise clearing" : energy "enterprise inference compute" substance compute amount 2000 unit Gtok/day

# ── Weights signals: ample, and now the grammar can say so ───────────
# Amplifying emits min(signal × gain, power): with the signal ample the
# min always selects power, so each model's token output tracks its
# metered compute exactly — availability of weights is never the
# binding constraint in this market; compute allocation is. This used
# to be said with `amount 100000 unit avail/day`, a magic number the
# diagram then displayed; `ample` (#9) is that engineering fact as a
# word, and the engine holds the equivalence.
flow Anthropic -> Opus : informational "released weights & API" ample
flow Anthropic -> Fable : informational "released weights & API" ample
flow OpenAI -> GPT : informational "released weights & API" ample
flow Google -> Gemini : informational "released weights & API" ample
flow Google -> Gemma : informational "released weights & API" ample
flow Meta -> Llama : informational "released weights & API" ample
flow Alibaba -> Qwen : informational "released weights & API" ample
flow "DeepSeek (lab)" -> DeepSeek : informational "released weights & API" ample
flow "Open-weight field" -> "Other open" : informational "released weights & API" ample

# ── Developer clearing: relative weights = observed dev-channel share ─
# Calibration, June–July 2026, renormalized to this roster. Sources:
# OpenRouter rankings via Dirac labs-market-share (≈6 Ttok/day, OSS
# ≈60% of routed volume) and stockalarm/tech-insider digests (DeepSeek
# ≈16%, Anthropic 12–24% — sources disagree; midpoint taken). Weights
# are relative, so they need not sum to 100.
flow "Developer clearing" -> Opus : energy "dev serving share" amount 9 unit Gtok/day
flow "Developer clearing" -> Fable : energy "dev serving share" amount 6 unit Gtok/day
flow "Developer clearing" -> GPT : energy "dev serving share" amount 9 unit Gtok/day
flow "Developer clearing" -> Gemini : energy "dev serving share" amount 11 unit Gtok/day
flow "Developer clearing" -> Gemma : energy "dev serving share" amount 2 unit Gtok/day
flow "Developer clearing" -> Llama : energy "dev serving share" amount 3 unit Gtok/day
flow "Developer clearing" -> Qwen : energy "dev serving share" amount 13 unit Gtok/day
flow "Developer clearing" -> DeepSeek : energy "dev serving share" amount 16 unit Gtok/day
flow "Developer clearing" -> "Other open" : energy "dev serving share" amount 20 unit Gtok/day

# ── Enterprise clearing: relative weights = spend share as workload proxy ─
# Menlo Ventures enterprise LLM API survey (2025→2026): Anthropic 40%
# (split Opus 30 / Fable 10, in-lab split estimated), OpenAI 27%,
# Google 21% (Gemini 20 / Gemma 1), open-weight roughly a tenth of
# enterprise workload (Vercel AI Gateway: <4% of SPEND — spend
# understates workload at one-tenth prices). Spend-as-workload is a
# proxy with known bias; replace when a workload series exists.
flow "Enterprise clearing" -> Opus : energy "enterprise serving share" amount 30 unit Gtok/day
flow "Enterprise clearing" -> Fable : energy "enterprise serving share" amount 10 unit Gtok/day
flow "Enterprise clearing" -> GPT : energy "enterprise serving share" amount 27 unit Gtok/day
flow "Enterprise clearing" -> Gemini : energy "enterprise serving share" amount 20 unit Gtok/day
flow "Enterprise clearing" -> Gemma : energy "enterprise serving share" amount 1 unit Gtok/day
flow "Enterprise clearing" -> Llama : energy "enterprise serving share" amount 4 unit Gtok/day
flow "Enterprise clearing" -> Qwen : energy "enterprise serving share" amount 3 unit Gtok/day
flow "Enterprise clearing" -> DeepSeek : energy "enterprise serving share" amount 3 unit Gtok/day
flow "Enterprise clearing" -> "Other open" : energy "enterprise serving share" amount 2 unit Gtok/day

# ── Served output: information delivered, compute already spent ──────
# Token output is Message — it lands, it is never ledgered; the ledger
# instead shows every Gtok/day of compute dissipating as heat, which is
# the thermodynamic truth of inference. Market share is read off each
# model's activity in the trace.
flow Opus -> "Applications served" : informational "tokens served" substance tokens unit Gtok/day
flow Fable -> "Applications served" : informational "tokens served" substance tokens unit Gtok/day
flow GPT -> "Applications served" : informational "tokens served" substance tokens unit Gtok/day
flow Gemini -> "Applications served" : informational "tokens served" substance tokens unit Gtok/day
flow Gemma -> "Applications served" : informational "tokens served" substance tokens unit Gtok/day
flow Llama -> "Applications served" : informational "tokens served" substance tokens unit Gtok/day
flow Qwen -> "Applications served" : informational "tokens served" substance tokens unit Gtok/day
flow DeepSeek -> "Applications served" : informational "tokens served" substance tokens unit Gtok/day
flow "Other open" -> "Applications served" : informational "tokens served" substance tokens unit Gtok/day

# ── Declared parameters: the model's own vocabulary for its knobs ────
# What a user of this simulation actually wants to slide (walkthrough
# #18): channel demand and market shares, not "relative weights". Each
# param names an amount declared above; the % presentation of a shares
# group is display-only — the engine keeps the raw weights. Cost/price
# parameters are legitimately absent: they need the money counter-flow
# plane this model deliberately defers.
param "Developer demand" : flow "Developer workload" -> "Developer clearing" range 0..12000
param "Enterprise demand" : flow "Enterprise workload" -> "Enterprise clearing" range 0..8000
param shares "Developer market share" : from "Developer clearing"
param shares "Enterprise market share" : from "Enterprise clearing"

# ── Declared metrics: the model's own vocabulary for its readouts ────
#
# The output twin of the params above (#203): a metric names a computed
# reading of the run, in market words. Shares are named as PRODUCED
# observables of the run — today they echo the declared split, and when
# the clearing becomes agent-chosen (#269) the same declarations read the
# endogenous result with no rewrite.
metric "DeepSeek dev share" : share of flow "Developer clearing" -> DeepSeek
metric "Opus enterprise share" : share of flow "Enterprise clearing" -> Opus
metric "Opus tokens served" : sum into Opus
metric "Fable tokens served" : sum into Fable
metric "DeepSeek tokens served" : sum into DeepSeek
metric "Qwen tokens served" : sum into Qwen

@lens mobus
