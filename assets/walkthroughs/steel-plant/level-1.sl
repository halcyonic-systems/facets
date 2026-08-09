# ── Steel-Plant, level 1 — the transparent box (Figs. 4.15 + 4.16) ──────────
#
# The child of the walkthrough's level-0 "Steel-Plant" component
# (examples/steel-plant-walk.sl). Two figures drawn as one model, because
# that is how the chapter reveals them: Fig. 4.15 finds the boundary
# interfaces while the interior is still opaque, and Fig. 4.16 exposes the
# four internal subsystems those interfaces serve. The environment lines are
# the seam's other half — stand-ins carrying, name for name, the level-0
# neighbors of the decomposed component, exactly what the boundary contract's
# derived-environment row checks.
#
# Editorial, not corpus: this model is shipped as the walk's middle rung, its
# JSON archive pinned to this text by tests/steel_walkthrough.rs.

system "Steel-Plant" : Concrete/Technical

domain "Steel manufacturing"

time unit month

level Structure

# E′ — the interior neighborhood of the level-0 component, one stand-in per
# neighbor, names carried exactly. Iron-Source and Coke-Source are Mobus's
# hybrids (matter out, purchase orders back in); the words here are author
# intent only — the kernel derives each thing's reading from the drawn flows.
source Energy-Source
source Iron-Source
source Coke-Source
sink Steel-Sink
sink Garbage-Sink
sink ATMOSPHERE

# Fig. 4.15's boundary interfaces, I0.0 through I0.5, each `interface`
# because it gates a flow across this model's membrane. The FuseBox receives
# electricity; the two loading docks receive material shipments ("Protocol
# includes moving iron supplies into inventory" — Listing 4.2); the shipping
# docks and Ventilation export.
component FuseBox interface
component Iron-LoadingDock interface
component Coke-LoadingDock interface
component Steel-ShippingDock interface
component Waste-ShippingDock interface
component Ventilation interface

# Fig. 4.16's four internal subsystems. Iron-Inventory is the one the chapter
# decomposes (type=PROCESS type=COMPLEX in Listing 4.4) — the walk's second
# door, and deliberately carrying no primitive: its transformation is the
# level-2 model's to reveal. Coke-Inventory stays closed, exactly as the
# figure leaves it: analysis opens one subsystem at a time. Production is the
# steel-making work process itself.
component Iron-Inventory decomposes "Iron-Inventory" @VjCKBe5psWuHcmW2yE8nXM
component Coke-Inventory
component Material-Purchasing interface
component Production primitive Combining

# Energy: grid → FuseBox → the power-hungry production floor.
flow Energy-Source -> FuseBox : energy "F-1.0 — electric energy" substance electricity
flow FuseBox -> Production : energy "distributed power" substance electricity

# Matter in: the Fig. 4.17 scenario, first half — "receipt of shipments of
# iron from the vendor (F-1.1) through interface (I0.1), from there into the
# iron-stock." The coke side mirrors it.
flow Iron-Source -> Iron-LoadingDock : matter "F-1.1 — iron-input" substance iron
flow Iron-LoadingDock -> Iron-Inventory : matter "shipment into inventory" substance iron
flow Coke-Source -> Coke-LoadingDock : matter "F-1.2 — coke-input" substance coke
flow Coke-LoadingDock -> Coke-Inventory : matter "shipment into inventory" substance coke

# Matter through: batches withdrawn from stock when it is time to make steel
# (F0.1, the one internal flow Listing 4.3 writes out — MATERIAL, subtype
# IRON, units TONS), and the coke equivalent.
flow Iron-Inventory -> Production : matter "F0.1 — iron in batches" substance iron unit tons
flow Coke-Inventory -> Production : matter "coke in batches" substance coke

# Matter and energy out, through the export interfaces of Fig. 4.15.
flow Production -> Steel-ShippingDock : matter "finished steel" substance steel
flow Steel-ShippingDock -> Steel-Sink : matter "F-1.3 — steel for sale" substance steel
flow Production -> Waste-ShippingDock : matter "scrap and wastage" substance garbage
flow Waste-ShippingDock -> Garbage-Sink : matter "F-1.4 — scrap and wastage" substance garbage
flow Production -> Ventilation : energy "process heat" substance heat
flow Ventilation -> ATMOSPHERE : energy "F-1.5 — radiated waste heat" substance heat

# The messages-only interface, "an often overlooked one in real life."
# Material-Purchasing was discovered during analysis of the loading docks —
# invoices and shipping documents pass between purchasing and receiving —
# and it talks to the vendors both ways, which is what makes it a hybrid.
flow Material-Purchasing -> Iron-Source : informational "purchase orders — iron"
flow Material-Purchasing -> Coke-Source : informational "purchase orders — coke"
flow Iron-Source -> Material-Purchasing : informational "shipping documents — iron"
flow Coke-Source -> Material-Purchasing : informational "shipping documents — coke"
flow Material-Purchasing -> Iron-LoadingDock : informational "shipping documents to receiving"
flow Material-Purchasing -> Coke-LoadingDock : informational "shipping documents to receiving"

# The purchase request rising out of the inventory room — Fig. 4.17's decider
# messaging the purchasing office (C0.3). At this level it reads as one flow
# from the closed box; level 2 shows who inside actually sends it. The coke
# side is our symmetric completion, not the figure's.
flow Iron-Inventory -> Material-Purchasing : informational "purchase request — iron"
flow Coke-Inventory -> Material-Purchasing : informational "purchase request — coke"

@lens mobus
