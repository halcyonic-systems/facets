# ── The two policy channels ──────────────────────────────────────────
# A companion to `federal-reserve.sl`, asking a different question. That
# model opens the Fed and shows how monetary policy is conducted. This
# one stays outside both organs and asks only: WHO CAN PAY WHOM, and
# with what kind of money.
#
# The distinction the model exists to draw is between two things that
# are both called "stimulus" and are not the same object:
#
#   CREDIT   — lent, intermediated, and repayable. The Fed's channel.
#              Every dollar has a counterparty who owes it back.
#   TRANSFER — given, direct, and not repayable. Congress's channel.
#
# Read it before arguing about whether either is good. Nothing here
# says that; the model is the shared ground the argument stands on.
#
# WHY THE SOI IS THE POLICY APPARATUS AND NOT "THE FED": if the Fed were
# the system, Congress would sit in the environment and the flow from
# Congress to households would have BOTH ENDS in the environment. Such
# an edge passes Mobus with zero issues while violating the Lean
# well-formedness predicate `bipartite` — a live gap, bert-lenses#322.
# Naming the containing whole makes both organs components, so every
# flow crosses the membrane exactly once and nothing rests on the gap.
#
# EXPECT A BUNGE REFUSAL. It is the point — see "What the kernel says".

system "U.S. Federal Economic Policy" : Concrete/Social

domain "The two channels through which federal policy reaches the economy: central-bank credit, and congressional transfers"

description "The federal apparatus that acts on the economy, drawn as its two organs. The point of drawing them together is that they reach different people by different means: the Fed extends credit, which is intermediated and repayable, and Congress makes transfers, which are direct and are not."

# Coupled organs, no authored rule between them — see fork 1.
level Structure

# ── Components ───────────────────────────────────────────────────────

# THE FEDERAL RESERVE. Modulating: it regulates flows it does not
# itself originate — it sets a price and a quantity, and the banks
# decide whether to pass anything on. Its own statement of what it does
# is four responsibilities, of which only the first is "monetary
# policy": https://www.federalreserve.gov/faqs.htm
# The instruments are enumerable and few — NINE named policy tools:
# https://www.federalreserve.gov/monetarypolicy/policytools.htm
component "Federal Reserve" primitive Modulating interface description "Modulating: it regulates flows it does not originate. It sets a price and a quantity; the banks decide whether to pass anything on."

# CONGRESS. Also Modulating, and the contrast is the point: it directs
# money it does not hold either, but its channel terminates on the
# household rather than on a bank. Fiscal capacity is appropriation,
# not lending — the money need not come back.
component Congress primitive Modulating interface description "Also Modulating, and the contrast is the point: it directs money it does not hold either, but its channel terminates on the household rather than on a bank."

# ── Environment ──────────────────────────────────────────────────────

# The Fed's counterparties. Every Fed dollar lands HERE first; whether
# it goes further is the banks' decision and not the Fed's.
environment "Banks and Dealers"

# Reachable directly by Congress, and by the Fed only as borrowers.
environment "Households and Firms"

# ── Flows ────────────────────────────────────────────────────────────

# The purchase, side one: securities leave the banks...
flow "Banks and Dealers" -> "Federal Reserve" : matter "securities sold" substance securities description "The purchase, side one — securities leave the banks for the desk."

# ...and side two: the reserves that pay for them are CREATED, not
# moved. This is the money-creation flow, and it terminates on a bank.
# Measured: Treasury holdings rose $2.36 trillion between mid-March and
# 12 Aug 2020, from 15% to 22% of outstanding Treasury debt — done, in
# the Fed's own words, "to restore market functioning":
# https://www.federalreserve.gov/monetarypolicy/bsd-recent-developments-202008.htm
flow "Federal Reserve" -> "Banks and Dealers" : matter "reserves created" substance reserves description "The reserves that pay for the securities are created, not moved. This is the money-creation flow, and it terminates on a bank."

# Lending, not spending. Repo peaked at $496 billion in mid-March 2020
# and fell to zero by early July — a loan, made and unwound. (Same
# source as above.) Luke's own citation for the operations announcement:
# https://www.newyorkfed.org/markets/opolicy/operating_policy_200315
flow "Federal Reserve" -> "Banks and Dealers" : matter "credit lent" substance credit description "Against collateral — lending, not spending. Repo peaked at $496 billion in mid-March 2020 and fell to zero by early July, a loan made and unwound."

# The mediated leg, and the one nobody controls. The Fed can make credit
# cheap and abundant at the bank; it cannot make the bank lend, nor a
# household borrow. Whether this arrow is traversed is the whole
# question of "transmission".
flow "Banks and Dealers" -> "Households and Firms" : matter "credit extended" substance credit description "At the banks' discretion — the mediated leg nobody controls. The Fed can make credit cheap and abundant at the bank; it cannot make the bank lend, nor a household borrow. Whether this arrow is traversed is the whole question of 'transmission'."

# Congress's channel: no intermediary, and nothing owed back. Cheques,
# topped-up unemployment, PPP. This is the arrow that is NOT credit,
# and the difference in substance is the model's central claim.
flow Congress -> "Households and Firms" : matter "transfers" substance transfers description "Cheques, topped-up unemployment, PPP — no intermediary, and nothing owed back. This is the arrow that is not credit, and the difference in substance is the model's central claim."

# ── What each organ steers by ────────────────────────────────────────

# The Fed reads markets, not people.
flow "Banks and Dealers" -> "Federal Reserve" : informational "market conditions" description "Spreads, funding pressure, dealer capacity — the Fed reads markets, not people."

# Congress reads people, not markets.
flow "Households and Firms" -> Congress : informational "political signal" description "Constituents, elections — Congress reads people, not markets."

# ── What the kernel says ─────────────────────────────────────────────
# Mobus: 0 issues. Klir: 0 issues. Runs.
#
# Bunge: REFUSED, and this is the finding rather than a defect —
#   "Bunge Def 1.1: a system requires at least one bond between
#    distinct components; an unbonded collection is an aggregate"
#
# There is no flow between the Fed and Congress, so as drawn they are
# not a system. They are two controllers acting independently on a
# shared environment. That is one checkable statement of both "it isn't
# exactly centralized" and the cybernetic worry about two uncoordinated
# regulators. The repair is fork 1, and it is deliberately not applied:
# the reader should decide whether the bond exists.
#
# ── Open forks ───────────────────────────────────────────────────────
# 1. IS THERE A BOND? The candidate is the CARES Act placing Treasury
#    equity behind the Fed's Section 13(3) facilities — which, if real,
#    is a flow from the fiscal organ to the monetary one and makes this
#    a system under Bunge. NOT VERIFIED: the two primary routes to it
#    (congress.gov/crs-product/R44185 and the Fed's own 13(3) page)
#    refused automated retrieval on 2026-08-13. Do not assert it until
#    someone opens a document. It is listed as a question, not a fact.
# 2. The 13(3) facilities did target "households, businesses, nonprofits,
#    and state and local governments" directly by name (bsd-recent-
#    developments-202008). Drawn here as credit through the banks, since
#    the facilities lent through eligible lenders and SPVs rather than
#    writing to a person — but the aggregation deserves a second look.
# 3. Banks and dealers are one environment thing. In March 2020 the
#    distinction mattered: it was DEALER capacity that failed, not bank
#    solvency. Splitting them is the natural next model.
# 4. No Treasury. It is both the Fed's banker and the issuer of what the
#    Fed buys, and at this level it is aggregated into Congress's
#    channel. `federal-reserve.sl` draws it properly.
#
# ── Deliberately absent ──────────────────────────────────────────────
# Supervision, financial stability, and payment services — three of the
# Fed's four stated responsibilities (federalreserve.gov/faqs.htm). This
# model draws only the first. A model of "what the Fed does" that shows
# one quarter of its mandate should say so out loud.

@lens mobus
