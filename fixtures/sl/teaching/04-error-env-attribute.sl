# ── Another instructive failure: attributes on the wrong thing ───────
# Only a `component` can carry attributes (`primitive …`, `interface`).
# Environment things — `source`, `sink`, `environment` — are opaque: the
# model does not describe their internals (spec §4.3), so an attribute on
# one is a parse fault. Compile this to read the error.
#
# The fix: drop the attribute from `Rain`, or, if the thing really is a
# part inside your boundary, declare it a `component` instead.

system "Reservoir" : Concrete/Physical
component Tank primitive Buffering interface
source Rain primitive Propelling
sink Outlet
flow Rain -> Tank : matter "rainfall"
flow Tank -> Outlet : matter "release"

# Expected parse errors (1-indexed). SL collects EVERY fault in one pass
# (spec §4.6), so you see two, and the second is a knock-on of the first:
#   line 12: `primitive` applies to components only — fix: drop
#            `primitive Propelling` from this line, or declare it as
#            `component` instead of `source` if it is inside the boundary
#   line 14: `Rain` is not declared (declare things before flows) — fix: add
#            `source Rain` above this line, or `component Rain` if it sits
#            inside the boundary
# Because line 12 fails, `Rain` never registers as a thing, so the flow on
# line 14 has an unresolved endpoint. Fix line 12 and BOTH errors clear.
#
# This is the one place to read a repair with judgment: line 14's suggestion
# is correct in isolation but redundant here, because `Rain` IS declared —
# its line just failed. Each fault is repaired independently; a knock-on
# clears when its cause does. Fix the first error first.
