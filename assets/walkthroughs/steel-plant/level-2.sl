# ── Iron-Inventory, level 2 — inside the inventory room (Fig. 4.17) ─────────
#
# The child of level-1's Iron-Inventory component (C0.1 / S0.1 in Listing
# 4.4). The figure shows "active (pump shapes) work being done to move the
# iron into and out of the stock," a level sensor on the stock, and an agent
# — the decider, D0.1.1, type=AGENT subtype=COORDINATION — who manages the
# work processes, monitors the level, and "sends a purchase request to the
# Material-Purchasing office (C0.3)."
#
# The environment stand-ins are the seam's other half, carrying the level-1
# neighbors name for name. Mobus's own Listing 4.4 makes the same move one
# entity earlier than the contract does: it writes C0.6, a sibling subsystem,
# into Iron-Inventory's environment as a sink — the environment of a
# subsystem is its neighbors, whatever level they live at.
#
# Editorial, not corpus: shipped as the walk's bottom rung, its JSON archive
# pinned to this text by tests/steel_walkthrough.rs.

system "Iron-Inventory" : Concrete/Technical

domain "Steel manufacturing"

# Listing 4.4 declares this subsystem's own tick: delta_t WEEKLY. A level
# down, a faster clock — Mobus's level-indexed Δt in one line.
time unit week

level Structure

# E′: the three level-1 neighbors. The loading dock delivers, Production
# draws batches, and the purchasing office receives the decider's requests.
source Iron-LoadingDock
sink Production
sink Material-Purchasing

# The two pump shapes — work processes that MOVE iron, Propelling in the
# primitive taxonomy. Both are interfaces of this model: Move-In receives
# across the membrane (I0.1.1), Move-Out is Listing 4.4's Iron-Batching
# exporter ("creates batches of iron for production," protocol @batch_iron).
component Move-In primitive Propelling interface
component Move-Out primitive Propelling interface

# Stk0.1.1, the iron stock itself — Buffering, with its own declared unit
# (Listing 4.3 gives F0.1 units=TONS, and a stock's dimension is its flow's
# accumulated over Δt).
component Iron-Stock primitive Buffering stock tons

# The orange triangle on the stock. Sensing is the substance-crossing
# primitive: a physical quantity in, a signal out — so its coupling to the
# stock is matter, and everything downstream of it is signal.
component Level-Sensor primitive Sensing

# D0.1.1, the decider — an AGENT in Listing 4.4's own type vocabulary, not
# one of the ten work-process primitives, so it carries none. `interface`
# because its purchase request crosses this model's membrane (the message
# transits I0.1.2 on its way to C0.3).
component Inventory-Decider interface

# The iron path: shipments in, stock, batches out — the second half of the
# Fig. 4.17 scenario begun at level 1.
flow Iron-LoadingDock -> Move-In : matter "shipment arriving" substance iron
flow Move-In -> Iron-Stock : matter "moved into stock" substance iron
flow Iron-Stock -> Move-Out : matter "withdrawn in batches" substance iron
flow Move-Out -> Production : matter "F0.1 — iron in batches" substance iron unit tons

# The management loop: stock level read, reported, and acted on. The sensor's
# tap on the stock is an observation, non-draining.
flow Iron-Stock -> Level-Sensor : matter "stock level reading" substance iron
flow Level-Sensor -> Inventory-Decider : informational "measured inventory level"
flow Inventory-Decider -> Move-In : informational "receiving instructions"
flow Inventory-Decider -> Move-Out : informational "batching instructions"

# The message that started the chapter's next discovery: analyzing this room
# is how Material-Purchasing was found at all.
flow Inventory-Decider -> Material-Purchasing : informational "purchase request"

@lens mobus
