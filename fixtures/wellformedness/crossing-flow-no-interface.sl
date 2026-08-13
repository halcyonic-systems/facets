# CONTROL for docs/wellformedness-mapping.md — Lean `bipartite`, forward half.
# `Core` is not stamped `interface`, so the crossing flow lands on a component
# outside I. The kernel refuses this at Operational/Full
# (`crossing_flow_without_interface`) and stays silent at Core/Structural.
# It is the control for `env-to-env-flow.sl`: the same predicate, the half the
# kernel does enforce, so the other file's silence is a gap and not a build
# problem.

system "Crossing-flow control" : Concrete/Technical
level Source
component "Core" primitive Combining
source Src
flow Src -> "Core" : matter "in" substance stuff
@lens mobus
