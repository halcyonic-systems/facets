# ── STRAWMAN — the Federal Reserve as a work process ─────────────────
# Open forks are listed at the bottom; every structural choice here is
# provisional until ratified. The claim this model exists to make: the
# Fed's instrument IS its balance sheet, and money creation is one
# purchase seen from both sides — securities flow in, and the reserves
# that pay for them are minted on the way out. That pair of opposed
# matter flows is the "money counter-flow plane" llm-market deferred.
#
# Level-1 only, deliberately: one decider, one work process, one stock,
# three environmental entities. The twelve regional banks, the discount
# window, currency, and the Treasury's own account are aggregated away
# or deferred — each is a named fork below, not a silent omission.

system "Federal Reserve" : Concrete/Social

domain "Central banking — the balance sheet as the instrument of monetary policy"

# The decider. The FOMC reads the economy and issues the directive; it
# moves no money itself. No work-process primitive is declared — its
# work is deciding, and forcing it into Combining/Splitting/Buffering
# would be a reading, not a fact (fork 4).
component FOMC interface

# The work process. The desk executes the directive by buying and
# selling in the open market — the one place policy touches the flows.
component "Open Market Desk" primitive Combining

# The stock. Assets accumulate on one side, and the reserves and
# remittances they generate leave from the other.
component "Balance Sheet" primitive Buffering interface

# The commercial banks, in aggregate: counterparty to every operation,
# holder of the reserves the Fed mints. Two-way by nature.
environment "Banking System"

# The fiscal side: the Fed returns its net income to the Treasury.
# (That the Treasury also BANKS at the Fed is fork 3.)
environment "U.S. Treasury"

# There is no "economy" in this model, on purpose (ratified 2026-08-08):
# the Fed never touches an aggregate — it reads measurements published
# by named agencies, and its announcement lands on named markets.
# Households and firms sit BEHIND the banks and the markets, reached
# only mediated, which at level 1 means: not directly at all.

# The instrument panel. BEA's PCE deflator, BLS payrolls and prices —
# the FOMC steers by published measurements, with their own lags and
# revisions, not by the thing itself.
source "Statistical Agencies"

# The transmission surface: dealers, money markets, the curve. The
# announcement works by repricing expectations, and the markets talk
# back in market-implied terms.
environment "Financial Markets"

# The sensing leg: the dual-mandate measurements, read as information.
flow "Statistical Agencies" -> FOMC : informational "published measurements — PCE inflation, payrolls, unemployment"

# The directive: the target range, handed to the desk to implement.
flow FOMC -> "Open Market Desk" : informational "policy directive — the target range"

# The announcement: much of the mechanism is expectation, not
# transaction — the decision reprices the curve the moment it lands.
flow FOMC -> "Financial Markets" : informational "the announced decision — rates as forward guidance"

# And the markets answer: what the path is now expected to be.
flow "Financial Markets" -> FOMC : informational "market-implied expectations — breakevens, the futures-implied path"

# The purchase, side one: securities move from the banks to the desk...
flow "Banking System" -> "Open Market Desk" : matter "securities sold to the desk"

# ...and onto the asset side of the balance sheet.
flow "Open Market Desk" -> "Balance Sheet" : matter "securities held"

# The purchase, side two: the reserves that pay for it — created, not
# transferred. This is the money-creation flow.
flow "Balance Sheet" -> "Banking System" : matter "reserve balances minted in payment"

# What holding the reserves earns the banks — the rate the Fed
# administers directly.
flow "Balance Sheet" -> "Banking System" : matter "interest on reserves"

# What the portfolio earns, net of expenses, goes back to the fisc.
flow "Balance Sheet" -> "U.S. Treasury" : matter "remittances — net income returned"

# ── Open forks (ratify before this leaves strawman) ──────────────────
# 1. Discount window and standing facilities (ON RRP): lender-of-last-
#    resort as a level-1 flow pair, or a mode of the same balance sheet?
# 2. Currency: Federal Reserve notes reach the public through the banks.
#    A matter flow Balance Sheet -> Banking System -> beyond, or out of
#    scope at level 1?
# 3. Treasury General Account: the Treasury banks AT the Fed, which
#    would make "U.S. Treasury" two-way and the remittance one flow of
#    several. Kept one-way here for minimality.
# 4. FOMC carries no primitive. If a decider must be a work process,
#    which one — and does Mobus's ch. 7 precedent (no primitives
#    declared) govern editorial entries too?
# 5. Aggregation: the twelve regional Reserve Banks are one SOI here,
#    on the HSS precedent ("aggregating all inputs and outputs of each
#    type into single arrows"). Norfolk's Richmond Fed would disagree.
#
# ── Ratified ─────────────────────────────────────────────────────────
# ✓ (2026-08-08) No aggregate "economy" actor. The former environment
#   "The Economy" split into source "Statistical Agencies" (the Fed
#   steers by an instrument panel — published measurements, not the
#   thing itself) and environment "Financial Markets" (transmission =
#   repricing expectations; markets talk back). Households and firms
#   are deliberately unreachable at level 1: every path to them is
#   mediated through banks or markets.

@lens mobus
