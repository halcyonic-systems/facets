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

# The dual-mandate data source and the audience for the announcement.
environment "The Economy"

# The sensing leg: prices and employment, read as information.
flow "The Economy" -> FOMC : informational "dual-mandate data — inflation and employment"

# The directive: the target range, handed to the desk to implement.
flow FOMC -> "Open Market Desk" : informational "policy directive — the target range"

# The announcement: the decision itself is a public signal, and much of
# the mechanism is expectation, not transaction.
flow FOMC -> "The Economy" : informational "the announced decision — rates as forward guidance"

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

@lens mobus
