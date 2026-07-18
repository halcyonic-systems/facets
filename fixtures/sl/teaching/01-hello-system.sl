# ── Your first SL model ──────────────────────────────────────────────
# SL describes a system as text. Every line is one declaration, read top
# to bottom. This is the smallest useful model: two things and one flow.
#
# Compile it and watch the canvas draw a lamp, a battery, and an arrow.

# `system` names the whole you are modeling and, after the colon, asserts
# its type. `Concrete` = a system that physically exists (not a conceptual
# one); `Technical` = the genus, an engineered artifact. Both are optional.
system "Desk Lamp" : Concrete/Technical

# Things INSIDE the boundary are `component`s — the parts of your system.
component Lamp

# Things OUTSIDE the boundary are the environment: a `source` is where a
# flow begins, a `sink` is where one ends. The battery feeds the lamp, so
# it is a source.
source Battery

# A `flow` is a directed connection, written FROM -> TO. The `: energy`
# clause names what kind of stuff moves (energy / matter / field /
# informational); the quoted text names this particular flow.
flow Battery -> Lamp : energy "power"

# Lines starting with `@` are annotations: view state, never meaning.
# `@lens` picks which tradition's reading the app opens with.
@lens mobus
