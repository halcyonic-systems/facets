# ── STRAWMAN — Bitcoin: the system, wearing the asset as a face ──────
# The bridge model for the bitcoin-regimes collaboration. The claim it
# exists to make: bitcoin-the-asset is a METRIC SURFACE over
# bitcoin-the-system, not a separate thing. The protocol is a work
# process burning energy into settlement; the asset is what some of its
# readouts look like from a trading desk. One model must carry both,
# or the two research programs talk past each other.
#
# Compressed from the 18-system legacy model (assets/models/examples/
# bitcoin.json): the mining cluster survives as two components, the
# settled chain as a stock, and the development/governance cluster is
# deferred whole (fork 3). What is NEW against the legacy model is the
# loop the ML work is hunting: congestion -> feerate -> displacement of
# small transactions — drawn here as flows, so the hypothesis has a
# structural referent before it has a statistical one.

# Social, ratified with recorded reluctance (2026-08-08): the blend is
# genuinely tough — a machine whose behavior is a fee market, a use
# case Bunge did not anticipate. Social wins because the loops this
# model exists to draw run through people's decisions; the machinery
# below them is Technical and says so in every flow label.
system "Bitcoin" : Concrete/Social

domain "Proof-of-work settlement — energy in, ordered history out, a fee market clearing queue position"

# The congestion queue. Unconfirmed transactions wait here, and the
# depth of the queue IS the fee market's state — Buffering, exactly as
# a reservoir or a bank reserve.
component Mempool primitive Buffering interface

# The work process. Miners combine waiting transactions with energy and
# produce blocks; feerate decides what gets combined first.
component Mining primitive Combining

# The stock the whole system exists to grow: settled, ordered history.
component "Chain State" primitive Buffering interface

# The people submitting transactions — and changing their behavior when
# the feerate signal reaches them. The displacement response lives in
# here, unmodeled (fork 5): environmental internals are not free.
environment Transactors

# Electricity, bought and burned. One-way by nature.
source "Energy Market"

# Nick's world: the exchanges where the readouts trade. Two-way — coins
# flow out to it, and the price flows back as a signal.
environment "Asset Market"

# Submission: transactions enter the queue.
flow Transactors -> Mempool : informational "submitted transactions, bidding for queue position"

# Selection: highest feerate first — the fee market clearing.
flow Mempool -> Mining : informational "transactions selected by feerate"

# The burn: hashes are bought with electricity.
flow "Energy Market" -> Mining : energy "electricity burned into proof of work"

# Settlement: blocks append to the chain.
flow Mining -> "Chain State" : informational "blocks appended"

# Confirmation: settled history reported back.
flow "Chain State" -> Transactors : informational "confirmations"

# ── Two feedback loops, of different epistemic rank ──────────────────
# The DIFFICULTY loop is feedback BY CONSTRUCTION: written into the
# protocol, retargeted every 2016 blocks, provable from the rules.
# The DISPLACEMENT loop is feedback BY CONJECTURE: hypothesized, and
# testable only in data (the SegWit-era hypothesis). One model, both
# loops, rank declared — that distinction is the point of drawing them.

# By construction: the chain observes its own block pace and adjusts
# the work required — the protocol's thermostat.
flow "Chain State" -> Mining : informational "difficulty — retargeted from observed block pace"

# By conjecture, the sensing leg: queue depth becomes a price. This is
# the flow the fee_percentiles extraction measures.
flow Mempool -> Transactors : informational "the feerate signal — the price of queue position"

# Issuance: the subsidy plus collected fees, minted to the miner by
# protocol rule. Structurally the Fed parallel: created in payment,
# not transferred (see federal-reserve.sl, same shelf).
flow "Chain State" -> Mining : matter "block reward — subsidy and fees, minted in payment"

# The asset face: miners sell to cover the energy bill...
flow Mining -> "Asset Market" : matter "coins sold to cover costs"

# ...and the price comes back to everyone as information.
flow "Asset Market" -> Transactors : informational "the price — bitcoin as an asset"

# ── Pass 2, planned (not this file): the tether ──────────────────────
# Amounts and declared metrics arrive with the CSV tether from
# bitcoin-regimes' btc_tx_percentiles_daily.parquet (6,166 days):
#   metric candidates: median feerate (p50 sat/vB), p90/p10 congestion
#   spread, small-tx share below the declared 0.001 BTC threshold.
# These are Nick's observables, declared in the model's own words —
# the same machinery llm-market uses. Until then this entry is
# structure only, and says so rather than carrying invented numbers.
#
# ── Open forks ───────────────────────────────────────────────────────
# 1. The development/governance cluster (the legacy model's whole
#    second half) — deferred until the governance lane needs it.
#
# ── Ratified (2026-08-08) ────────────────────────────────────────────
# ✓ Concrete/Social, with recorded reluctance — see the system line.
# ✓ Both loops drawn, epistemic rank declared: difficulty is feedback
#   by construction, displacement is feedback by conjecture.
# ✓ Asset Market stays an environment — the market for "bitcoin"
#   genuinely exists outside Bitcoin. No consensus rule consumes a
#   price; the price re-enters only through participants' decisions
#   (miners selling and entering/exiting, transactors weighing fees),
#   and both re-entry paths are already flows above. Two-way coupling
#   without membership: that IS the bridge claim.
# ✓ The displacement response stays hidden inside Transactors: the
#   model declares a mechanism it cannot see, and the ML work is the
#   test of exactly that mechanism.

@lens mobus
