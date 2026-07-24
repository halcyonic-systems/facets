# ── Two-sided marketplace, Bunge lens ────────────────────────────────
# Bunge's approach treats a system as a concrete thing-in-environment:
# what's inside the boundary (composition), what's outside (environment),
# and how the parts are bonded together (structure). Here the platform
# is decomposed into the internal mechanisms that make matching and
# monetization possible; buyers and sellers stay outside as the
# environment the platform is coupled to.

system "Two-Sided Marketplace" : Concrete/Social
domain "digital platform economy: matching buyers and sellers for a fee"

# ── Composition: the platform's internal mechanisms ──────────────────
# Platform itself is the aggregator/boundary component that all outside
# traffic passes through.
component Platform primitive Combining interface

# Price Signal reads aggregated supply & demand and modulates the price
# it hands back — the classic market-clearing mechanism.
component "Price Signal" primitive Modulating

# Fee Engine splits each transaction's value into a seller payout and
# retained platform revenue.
component "Fee Engine" primitive Splitting

# Network Effect amplifies buyer attraction as seller supply grows —
# the structural bond that makes "more sellers attract more buyers".
component "Network Effect" primitive Amplifying

# ── Environment: the two sides the platform is coupled to ────────────
environment Buyers
environment Sellers

# ── Structure: how information and value move through the parts ─────
flow Buyers -> Platform : informational "demand data"
flow Sellers -> Platform : informational "supply data"

flow Platform -> "Price Signal" : informational "supply & demand aggregate" mere
flow "Price Signal" -> Platform : informational "price quote"

flow Platform -> Buyers : informational "posted price"
flow Platform -> Sellers : informational "posted price"

flow Buyers -> Platform : matter "payment"
flow Platform -> "Fee Engine" : matter "transaction value" mere
flow "Fee Engine" -> Sellers : matter "seller payout"
flow "Fee Engine" -> Platform : matter "fee revenue" mere

flow Sellers -> "Network Effect" : informational "seller count" mere
flow "Network Effect" -> Buyers : informational "expanded seller variety"

@lens bunge