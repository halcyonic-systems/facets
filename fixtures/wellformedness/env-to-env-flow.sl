# probe for docs/wellformedness-mapping.md — Lean `bipartite` / `externalFlows_nodes`.
# `flow Src -> Snk` is an edge of G whose endpoints are both environment objects.
# The Lean forbids it: `IsBipartiteEdges G.edges O I` requires every external
# edge to have one end in O and the other in I, and `externalFlows_nodes` puts
# G's nodes in O ∪ I with the bipartition on top. Run this file under all three
# lenses and record what the kernel says.

system "Env-to-env probe" : Concrete/Technical
level Source
component "Core" primitive Combining interface
source Src
sink Snk
flow Src -> "Core" : matter "in" substance stuff
flow "Core" -> Snk : matter "out" substance stuff
flow Src -> Snk : matter "bypass" substance stuff
@lens mobus
