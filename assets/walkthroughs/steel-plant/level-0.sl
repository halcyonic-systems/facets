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
# The boundary is Fig. 4.14's own, honestly drawn (2026-08-09). An earlier
# revision promoted the six level(-1) entities to interior components — the
# v1 seam contract covered a component's internal network only, so a walkable
# box could not touch the membrane, and the drawing paid the price: the
# environment rendered INSIDE the boundary. SSF #43 (InterfaceDecomposition,
# merged) extends the contract to membrane crossings — the child's boundary
# must REFINE each crossing (same counterparty, same substance kind, landing
# on a named child interface) — so the SOI can now be a boundary-crossing
# walkable box and the sources and sinks can stand where Mobus drew them.

system "Steel-Plant — Deep Systems Analysis" : Concrete/Technical

domain "Steel manufacturing"

# The tick is Mobus's own: §4.5 names the transformation
# @monthly_steel_production, with the month as its unit.
time unit month

# The corpus steel-plant is Source — an opaque box, boundary variables only.
# This walk opens the box: coupled residents and a checked decomposition
# seam, which is exactly Klir's step up from source to structure
# (ratified test, 2026-08-08, #288). Each walk level declares its own.
level Structure

# S0, the SOI. Combining, because the plant's transformation takes iron, coke
# and electric energy together and yields steel — Listing 4.1's type=PROCESS.
# `interface` because at this resolution the opaque box IS its own boundary
# apparatus — every crossing lands on it, and I ⊆ C admits exactly one member
# until the child opens it into Fig. 4.15's six (the same reading the
# decomposition door gives a newborn: the root is the one interface member).
# The `decomposes` reference is the walk's first door: the child model is
# Fig. 4.16's interior, and the seam between the two is the boundary
# contract — interior AND crossing halves (SSF #43) — checked against the
# flows drawn here.
component "Steel-Plant" primitive Combining interface decomposes "Steel-Plant" @WVv2pzPHybekS7U3ewwVxx

# The six transaction partners of Fig. 4.14 — Src-1.0/1.1/1.2 and
# Snk-1.0/1.1/1.2 by their own names, environmental as the figure draws them.
# The material vendors are Mobus's hybrids (matter out, purchase orders back
# in); the words are author intent — the kernel reads each thing's role from
# the drawn flows, exactly as level 1 declares the same six.
source Energy-Source
source Iron-Source
source Coke-Source
sink Steel-Sink
sink Garbage-Sink
sink ATMOSPHERE

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
