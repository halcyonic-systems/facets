# ── Supply chain as a reorder-point control loop ─────────────────────
# A distribution chain is a stock-and-flow system with a feedback
# regulator: goods flow downstream from factory to customer, while a
# sensing loop watches inventory and reorders before it runs dry. The
# loop closes through the warehouse LEVEL — a state read, which is what
# makes the feedback well-posed — and its sign is negative: high stock
# throttles production, low stock opens it.

system "Supply Chain" : Concrete/Social

domain "Manufacturing and retail distribution, regulated by stock-based reordering"

time unit day

# The reorder loop is authored as wiring; its logic lives in comments and
# the stepping in the engine — the generating rule is not in the file
# (ratified 2026-08-08, #288 — the same call as watershed and llm-market).
level Structure

# The factory is the production line, modeled as a throttled work
# process (Modulating): raw materials pass through it at a rate set by
# the replenishment signal. No signal = wide open; a strong "shelves
# are full" signal chokes it down.
component Factory primitive Modulating interface

# Warehouse is the regulated Buffering stock: it fills from production
# and drains through retail sale. `interface` because the sale crosses
# the boundary to the customers. The feedback pins its level — watch it
# lock onto the reorder point and hold there.
component Warehouse primitive Buffering interface stock pallets

# The ordering system Senses warehouse stock — a non-draining level
# read (Conant–Ashby: a good regulator is a model of the thing it
# regulates), and the state anchor the whole control loop hangs on.
component "Ordering System" primitive Sensing

# Reorder logic is the comparator (Inverting): reorder pressure =
# reference − measured stock. High inventory → weak order signal;
# empty shelves → order hard.
component "Reorder Logic" primitive Inverting

# Environment: where materials enter and finished goods leave the chain.
source Suppliers
sink Customers

# The downstream matter flow: raw materials → goods → sale. Suppliers
# deliver 2 pallets/day; everything downstream is transport and stock
# release, so only the source flow declares a magnitude.
flow Suppliers -> Factory : matter "raw materials" substance goods amount 2 unit pallets/day
flow Factory -> Warehouse : matter "finished goods"
flow Warehouse -> Customers : matter "retail sale"

# The feedback loop: level read → comparison → throttle. Reorder-point
# control, closed through the warehouse state.
#
# The sensor's coupling to the stock is MATTER, not information: per
# Mobus, Sensing is the substance-crossing primitive — a physical
# quantity in, a signal out. The read is an observation tap (stock →
# sensor), non-draining; everything downstream of the sensor is signal.
flow Warehouse -> "Ordering System" : matter "stock level reading"
flow "Ordering System" -> "Reorder Logic" : informational "measured inventory"
flow "Reorder Logic" -> Factory : informational "replenishment order"

@lens mobus
