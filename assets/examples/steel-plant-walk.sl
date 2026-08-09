# ── Steel-Plant — Deep Systems Analysis (an editorial walkthrough) ──────────
#
# Mobus's ch. 4 example is a procedure, not a picture: situate the SOI in its
# environment (Fig. 4.14), find the boundary interfaces (Fig. 4.15), expose
# the level-1 subsystems (Fig. 4.16), then take one of them — Iron-Inventory —
# down to level 2 (Fig. 4.17). The corpus entry (corpus/mobus/steel-plant.sl)
# stops deliberately at the chapter's first pause; this walkthrough is the
# rest of the procedure, wired for the decomposition walk. Three models, one
# per level, joined by `decomposes` references whose seams the boundary
# contract checks: this file is level 0, the opaque box; its child is
# Fig. 4.16's transparent box; that child's Iron-Inventory opens onto
# Fig. 4.17's inventory room. Editorial, not corpus — grounded in the figures
# but free to draw what the chapter reveals across all four of them.
#
# One departure from Fig. 4.14, made so the walk has a checked seam. The
# figure draws the six level(-1) entities as environmental sources and sinks;
# here they are things, and the opaque SOI sits among them as an interior
# component. v1's boundary contract covers a component's internal network
# only, so a walkable box must not touch the model's own membrane — and the
# promotion is licensed, not smuggled: Mobus's environment entities are other
# systems (each vendor has its own delivery schedule in Listing 4.1), and his
# own recursion carries them down a level, where Listing 4.4 cites Src-1.1,
# the iron vendor, inside Iron-Inventory's environment. Promoting them to
# residents of the level-0 model is the same move made one level earlier.

system "Steel-Plant — Deep Systems Analysis" : Concrete/Technical

domain "Steel manufacturing"

# The tick is Mobus's own: §4.5 names the transformation
# @monthly_steel_production, with the month as its unit.
time unit month

# S0, the SOI. Combining, because the plant's transformation takes iron, coke
# and electric energy together and yields steel — Listing 4.1's type=PROCESS.
# The `decomposes` reference is the walk's first door: the child model is
# Fig. 4.16's interior, and the seam between the two is the boundary contract,
# checked against the flows drawn here.
component "Steel-Plant" primitive Combining decomposes "Steel-Plant" @WVv2pzPHybekS7U3ewwVxx

# The six transaction partners of Fig. 4.14 — Src-1.0/1.1/1.2 and
# Snk-1.0/1.1/1.2 by their own names, each a system in its own right.
component Energy-Source
component Iron-Source
component Coke-Source
component Steel-Sink
component Garbage-Sink
component ATMOSPHERE

# The six flows of Fig. 4.14, F-numbers in the labels, substances from
# Listing 4.1's own subtype attributes.
flow Energy-Source -> "Steel-Plant" : energy "F-1.0 — electric energy" substance electricity
flow Iron-Source -> "Steel-Plant" : matter "F-1.1 — iron-input" substance iron
flow Coke-Source -> "Steel-Plant" : matter "F-1.2 — coke-input" substance coke
flow "Steel-Plant" -> Steel-Sink : matter "F-1.3 — steel for sale" substance steel
flow "Steel-Plant" -> Garbage-Sink : matter "F-1.4 — scrap and wastage" substance garbage
flow "Steel-Plant" -> ATMOSPHERE : energy "F-1.5 — radiated waste heat" substance heat

# The message traffic Fig. 4.14 does not yet draw. Listing 4.1 announces it —
# the SOI is subtype=MESSAGE — and Fig. 4.16 cashes it: Material-Purchasing
# "interacts with vendors through a variety of messages that are both
# incoming and outgoing," which makes the material vendors hybrids. Drawn at
# this level so the seam below can carry it: what crosses the box here is
# exactly what crosses the child's membrane there.
flow "Steel-Plant" -> Iron-Source : informational "purchase orders — iron"
flow "Steel-Plant" -> Coke-Source : informational "purchase orders — coke"
flow Iron-Source -> "Steel-Plant" : informational "shipping documents — iron"
flow Coke-Source -> "Steel-Plant" : informational "shipping documents — coke"

@lens mobus
