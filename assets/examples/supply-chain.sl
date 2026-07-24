# ── Supply chain as a reorder-point control loop ─────────────────────
# A distribution chain is a stock-and-flow system with a feedback
# regulator: goods flow downstream from factory to customer, while a
# sensing loop watches inventory and reorders before it runs dry. The
# Sensing → replenishment path is what keeps the shelves stocked, and
# the reason the chain self-regulates instead of starving.

system "Supply Chain" : Concrete/Social

domain "Manufacturing and retail distribution, regulated by stock-based reordering"

# The factory Combines raw materials into finished goods — the work
# process at the head of the chain. It is a boundary component: raw
# materials cross in from the suppliers outside the system.
component Factory primitive Combining interface

# Warehouse is a Buffering stock: an internal reservoir that fills from
# production and drains to the store. Purely internal — nothing crosses
# the boundary here, so it carries no interface designation.
component Warehouse primitive Buffering

# The store is the downstream Buffering stock that faces the customer;
# `interface` because the retail sale crosses the boundary to the sink.
component Store primitive Buffering interface

# The ordering system Senses warehouse stock and issues replenishment
# orders — the regulator that closes the control loop (Conant–Ashby: a
# good regulator is a model of the thing it regulates).
component "Ordering System" primitive Sensing

# Environment: where materials enter and finished goods leave the chain.
source Suppliers
sink Customers

# The downstream matter flow: raw materials → goods → restock → sale.
flow Suppliers -> Factory : matter "raw materials"
flow Factory -> Warehouse : matter "finished goods"
flow Warehouse -> Store : matter "restock shipment"
flow Store -> Customers : matter "retail sale"

# The feedback loop: the ordering system reads warehouse stock and
# drives factory production — reorder-point control.
flow Warehouse -> "Ordering System" : informational "stock level reading"
flow "Ordering System" -> Factory : informational "replenishment order"

@lens mobus
