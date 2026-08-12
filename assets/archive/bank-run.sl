# ── A bank run as a reinforcing feedback loop ────────────────────────
# The classic run is not just "money leaves a stock." It is a loop: the
# reserve level becomes information, that information becomes panic, and
# panic becomes more withdrawal — which drains the reserve further. This
# model puts the stock (Reserve) and the process that watches/splits it
# (Bank) inside the boundary, and the people and markets outside.

system "Bank Run" : Concrete/Social

domain "Depositor withdrawals draining a fractional reserve, amplified by panic feedback"

level Structure

# The bank takes deposits in and, each time, splits the flow: some stays
# as reserve, most goes out as loans. `Splitting` is the primitive for a
# work process that divides one inflow into multiple outflows.
component Bank primitive Splitting interface

# The reserve is the accumulator being drained and refilled — the
# classic `Buffering` stock, sitting on the boundary where flows cross.
component Reserve primitive Buffering interface

# Depositors both deposit (source-like) and withdraw (sink-like), and
# they receive the panic signal that changes their own behavior — so
# they are modeled as a two-way environment, not a one-way source/sink.
environment Depositors

# The loan market absorbs lent-out reserve and, in calmer times, returns
# repayments — also two-way.
environment "Loan Market"

# Ordinary deposits arrive as matter (money is a conserved quantity that
# accumulates, same reasoning as the savings-account fixture).
flow Depositors -> Bank : matter "deposits"

# The bank's splitting process sends a fraction into the reserve stock...
flow Bank -> Reserve : matter "reserve share"

# ...and lends the rest out into the market.
flow Bank -> "Loan Market" : matter "loans"

# Loans occasionally return as repayments, replenishing the reserve —
# the stabilizing counter-flow that panic can overwhelm.
flow "Loan Market" -> Reserve : matter "loan repayments"

# Depositors draw down the reserve directly.
flow Reserve -> Depositors : matter "withdrawals"

# Here is the loop's sensing leg: the reserve's level is read as a
# signal, not moved as stuff — hence `informational`.
flow Reserve -> Bank : informational "reserve level"

# And here is the amplifying leg: the bank (or the visible thinning of
# the reserve it manages) broadcasts that signal outward as panic,
# which drives more withdrawal, which drains the reserve further,
# closing the reinforcing loop that defines a run.
flow Bank -> Depositors : informational "panic signal"

@lens mobus