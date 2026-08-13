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

# Coupled subsystems, no authored rule — and note the contrast with the
# corpus steel-plant: THIS entry opens its box, so it stands a level up
# from a source-system characterization (ratified test, 2026-08-08, #288).
level Structure

# The decider. The FOMC reads the instrument panel and issues the
# directive; it moves no money itself. Modulating: it regulates the
# desk's operation — the sensing is done upstream by the statistical
# agencies, the work downstream by the desk.
component FOMC primitive Modulating interface

# The work process. The desk executes the directive by buying and
# selling in the open market — the one place policy touches the flows.
# Interface because the purchase crosses the boundary here: securities
# arrive from the Primary Dealers at the desk, and a crossing must land
# on the membrane (kernel precondition; QA 8/11).
component "Open Market Desk" primitive Modulating interface

# The stock. Assets accumulate on one side, and the reserves and
# remittances they generate leave from the other.
component "Balance Sheet" primitive Buffering interface

# The Fed's counterparties differ BY INSTRUMENT, so they are two entities.
# Primary dealers are the desk's counterparty in open market operations —
# a couple of dozen firms, several of them broker-dealer subsidiaries
# rather than banks. It was DEALER balance-sheet capacity that failed in
# March 2020, not bank solvency, which is why this split is structural
# and not cosmetic (see the FEDS note in Sources).
environment "Primary Dealers"

# The depository institutions: the discount window's borrowers, and the
# holders of the reserves the Fed mints and pays interest on. Two-way.
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

# The purchase, side one: securities move from the dealers to the desk...
flow "Primary Dealers" -> "Open Market Desk" : matter "securities bought by the desk" substance securities

# ...and onto the asset side of the balance sheet.
flow "Open Market Desk" -> "Balance Sheet" : matter "securities held"

# The purchase, side two: the reserves that pay for it — created, not
# transferred. This is the money-creation flow.
flow "Open Market Desk" -> "Primary Dealers" : matter "reserve balances minted in payment" substance reserves

# And the same operation run backwards — the desk sells from the
# portfolio and the reserves paid to it are extinguished. Dormant in an
# easing regime, structurally present always; the balance sheet has been
# shrinking since 2022 and this is the arrow that does it.
flow "Open Market Desk" -> "Primary Dealers" : matter "securities sold from the portfolio" substance portfolio
flow "Primary Dealers" -> "Open Market Desk" : matter "reserves extinguished in payment" substance settlement

# What holding the reserves earns the banks — the rate the Fed
# administers directly.
flow "Balance Sheet" -> "Banking System" : matter "interest on reserves" substance interest

# What the portfolio earns, net of expenses, goes back to the fisc.
flow "Balance Sheet" -> "U.S. Treasury" : matter "remittances — net income returned" unit "USD millions"

# The window: a standing channel, structurally present even when
# dormant — the channel is structure, its activation rate is dynamics.
flow "Banking System" -> "Balance Sheet" : matter "collateral pledged at the discount window"
flow "Balance Sheet" -> "Banking System" : matter "reserves lent at the window" substance credit

# Currency: notes reach the public only through the banks — a swap,
# reserves debited as notes ship. The public stays behind the banks,
# as households stay behind the markets.
flow "Balance Sheet" -> "Banking System" : matter "currency — notes issued against reserves" substance banknotes

# The fisc's checking account: TGA drawdowns and rebuilds move the
# same reserve stock policy steers, with no policy decision anywhere.
flow "U.S. Treasury" -> "Balance Sheet" : matter "TGA deposits — the Treasury's checking account" unit "USD millions"

# ── Open forks ───────────────────────────────────────────────────────
# 1. ON RRP: its counterparties are money-market funds, not banks — a
#    new environmental entity, deferred rather than drawn wrong.
# 2. Decomposition (future): the twelve district banks + the Board,
#    with Interdistrict Settlement Account flows between them — the
#    U.S. TARGET2, settling annually through reallocated SOMA shares.
#    A walk-down demo in the steel-plant-walkthrough vein.
#
# ── Ratified ─────────────────────────────────────────────────────────
# ✓ (2026-08-08) Discount window IS level-1 structure: a standing
#   channel is a channel; dormancy is a fact about rates, not shape.
# ✓ (2026-08-08) Currency flows to the Banking System, nowhere else —
#   the public is reached only through banks at this level.
# ✓ (2026-08-08) TGA drawn: the Treasury banks at the Fed, so the
#   fiscal side jostles the same reserve stock policy steers.
# ✓ (2026-08-08) FOMC is Modulating. The corpus's no-primitive rule is
#   fidelity discipline for transcribed entries; this entry is ours,
#   and the kernel's ten primitives include the right word.
# ✓ (2026-08-08) The twelve Reserve Banks stay aggregated into the SOI
#   (Mobus's HSS aggregation license). See fork 2 for what opening
#   them up would mean.
# ✓ (2026-08-08) No aggregate "economy" actor. The former environment
#   "The Economy" split into source "Statistical Agencies" (the Fed
#   steers by an instrument panel — published measurements, not the
#   thing itself) and environment "Financial Markets" (transmission =
#   repricing expectations; markets talk back). Households and firms
#   are deliberately unreachable at level 1: every path to them is
#   mediated through banks or markets.

# ── Sources ──────────────────────────────────────────────────────────
# Retrieved and checked 2026-08-13. Every structural claim below is
# either on one of these pages or listed as a fork above.
#
# The four stated responsibilities — this model draws the FIRST ONLY
# ("conducting the nation's monetary policy"); supervision, financial
# stability, and payment services are outside its boundary:
#   https://www.federalreserve.gov/faqs.htm
#
# The instruments. Nine named policy tools, which is the countable form
# of "a limited number of levers" — interest on reserve balances, open
# market operations, the discount window, overnight reverse repo (fork
# 1 above), the standing repo facility, central bank liquidity swaps,
# the FIMA repo facility, term deposits, reserve requirements:
#   https://www.federalreserve.gov/monetarypolicy/policytools.htm
#
# The balance sheet in 2020, for the flows drawn here. Treasury holdings
# +$2.36 trillion mid-March to 12 Aug 2020 (15% -> 22% of outstanding
# Treasury debt); traditional repo peaked at $496 billion in mid-March
# and reached zero by early July. The Fed's own stated purpose was
# "to restore market functioning in Treasury and agency MBS markets and
# to promote effective transmission of monetary policy":
#   https://www.federalreserve.gov/monetarypolicy/bsd-recent-developments-202008.htm
#
# Dealer capacity, and why dealers are their own entity here. Luke
# Friendshuh's citation, 2026-08-06:
#   https://www.federalreserve.gov/econres/notes/feds-notes/use-of-the-federal-reserves-repo-operations-and-changes-in-dealer-balance-sheets-20210806.html
#
# Companion model: `policy-channels.sl` stays OUTSIDE this boundary and
# asks who can pay whom, drawing Congress beside the Fed. Where this
# model opens the Fed, that one compares its channel with the fiscal
# one. Read together they separate credit from transfer.

@lens mobus
