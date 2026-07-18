# ── A model that DOES NOT compile — on purpose ───────────────────────
# SL fails loud: it reports every fault with a line number instead of
# guessing what you meant. Compile this file to READ the error; it is not
# meant to succeed. (Verified to error as described — see comment footer.)
#
# The rule being broken: a flow's endpoints must be DECLARED BEFORE the
# flow references them (spec §4.3, "declare-before-use"). Below, `Drain`
# is never given a `sink` / `source` / `component` line, so the last
# flow's endpoint does not resolve.
#
# The fix: add `sink Drain` above the flows, and the error disappears.

system "Leaky Tub" : Concrete/Physical
component Tub primitive Buffering interface
source Faucet
flow Faucet -> Tub : matter "inflow"
flow Tub -> Drain : matter "outflow"

# Expected parse error (1-indexed):
#   line 17: `Drain` is not declared (declare things before flows)
