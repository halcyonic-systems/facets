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

system "Bitcoin" : Concrete/Technical

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

# The sensing leg of the congestion loop: queue depth becomes a price.
# This is the flow the fee_percentiles extraction measures.
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
# ── Open forks (ratify before this leaves strawman) ──────────────────
# 1. Kingdom/Genus: Concrete/Technical here, but the system is socio-
#    technical and the Social shelf holds its nearest neighbors.
# 2. Difficulty adjustment — the protocol's own thermostat (hashrate ->
#    difficulty) — is a second feedback loop, omitted at level 1.
# 3. The development/governance cluster (the legacy model's whole
#    second half) is deferred, not denied.
# 4. Is "Asset Market" an environment or a subsystem? Keeping it
#    outside IS the bridge claim; moving it inside dissolves it.
# 5. The displacement response (small transactions leaving when fees
#    spike) happens inside Transactors, which this level cannot open.
#    The SegWit-era hypothesis tests exactly that hidden mechanism.

@lens mobus
