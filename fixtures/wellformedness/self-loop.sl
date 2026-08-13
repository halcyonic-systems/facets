# probe for docs/wellformedness-mapping.md — Lean `internal_lawful`, second
# conjunct (`PreNetwork.Lawful`'s `∀ e ∈ edges, e.source ≠ e.target`).
# The Lean predicate is unconditional: no lens, no mode, no gate. The kernel's
# `self_loop_flow` runs only at Operational/Full. Read this file under all three
# lenses to see where the conjunct is enforced and where it is not.

system "Self-loop probe" : Concrete/Technical
level Structure
component "A" primitive Combining
component "B" primitive Buffering
flow "A" -> "B" : matter "a to b" substance stuff
flow "A" -> "A" : matter "a to itself" substance stuff
@lens mobus
