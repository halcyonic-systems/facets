# Warehouse with a stock manager: an agent reorders when the shelves run
# low and stops when they are full, with a band in between.
#
# Domain: operations, a shop's back room and the person who reorders.
# Shape: an agent outside the flow path that watches a stock and switches
# a valve (on/off control with hysteresis), plus a lossy transport leg.
#
# Supplier       ships up to 20 crates a day when an order is open.
# Order Desk     is the valve on incoming deliveries (Modulating): open (1)
#                or shut (0), as the manager commands. With backpressure,
#                crates not ordered stay at the supplier.
# Delivery Van   carries the crates (Propelling, efficiency 0.9): one crate
#                in ten is broken on the way and written off.
# Warehouse      holds the crates (Buffering). Shoppers buy 10 a day
#                (release 10). It starts with 40.
# Stock Manager  is an agent. It watches the warehouse level and runs a
#                threshold rule: at or above 60 crates it shuts the order
#                desk (emit 0); under 30 it opens it (else 1); in between
#                it keeps doing what it did last.
#
# What to expect: the level saws between about 30 and 60. When the desk is
# open, 18 crates arrive a day against 10 sold, so the stock climbs 8 a
# day; when shut it falls 10 a day.
#
# Knobs to try:
#   - the band (above 60, below 30). Narrow it to above 45 below 40 and the
#     manager switches far more often.
#   - the van efficiency (0.9). At 0.5 only 10 crates a day arrive, which
#     just matches sales: with the desk open the level stops rising and
#     the manager never gets to shut it.
system "Warehouse" : Concrete/Social

domain "a shop's stock room and the person who reorders"

time unit day

source Supplier
    description "The wholesaler; ships when an order is open."
sink Shoppers
    description "The customers buying crates."

component "Order Desk" primitive Modulating interface backpressure
    description "Open or shut, as the stock manager commands."
component "Delivery Van" primitive Propelling efficiency 0.9
    description "Carries crates in; one in ten breaks on the way."
component Warehouse primitive Buffering stock crates initial 40 release 10
    description "The crates on the shelves; shoppers buy 10 a day."
interface Till
    description "Where crates leave with shoppers."

agent "Stock Manager" watches Warehouse rule threshold above 60 below 30 emit 0 else 1 manages "Order Desk"
    description "Shuts orders at 60 crates, reopens them under 30."

flow Supplier -> "Order Desk" : matter "shipment" substance crates amount 20 unit "crates/day"
flow "Order Desk" -> "Delivery Van" : matter "ordered" substance crates
flow "Delivery Van" -> Warehouse : matter "delivered" substance crates
flow Warehouse -> Till : matter "sold" substance crates
flow Till -> Shoppers : matter "sold" substance crates

param "shipment size" : flow Supplier -> "Order Desk" "shipment" range 0..60
param "sales" : release of Warehouse range 0..40
param "shut at" : above of "Stock Manager" range 1..100
param "reopen under" : below of "Stock Manager" range 1..100

metric "crates sold" : sum into Shoppers

@lens mobus
