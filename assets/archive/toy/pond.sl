# Pond: a stream fills it, an outlet drains it, the sun takes a little.
#
# Domain: ecology, the water balance of a small pond.
# Shape: one stock between a source and a sink (fill and drain).
#
# Stream  is the brook feeding the pond, 30 m3 a day.
# Pond    is the water held. It drains through its outlet in proportion
#         to how full it is (time constant 10 days), loses 2 m3 a day to
#         evaporation (maintenance), and cannot hold more than 400 m3
#         (capacity); anything above that spills over the bank.
# Outlet  is the stream below the pond.
#
# Knobs to try:
#   - the stream amount (30). The pond rests where inflow equals outflow,
#     about (30 - 2) x 10 = 280 m3. Set it to 50 and the pond rises
#     toward 480, hits the 400 m3 bank and spills.
#   - the time constant (10). A smaller number is a wider outlet and a
#     lower pond.
#
# Keep the step at 1 day. The engine charges evaporation per tick, not per
# day, so --dt 0.1 would evaporate ten times as much (see README).
system "Pond" : Concrete/Biological

domain "the water balance of a small pond"

time unit day

source Stream
    description "The brook that feeds the pond."
sink Downstream
    description "The stream below the pond's outlet."

interface Inlet
    description "Where the brook enters the pond."
component Pond primitive Buffering stock m3 initial 100 time constant 10 capacity 400 maintenance 2
    description "The water in the pond: drains at its level over 10 days, evaporates 2 m3 a day, spills above 400 m3."
interface Outlet
    description "The pond's outlet into the stream below."

flow Stream -> Inlet : matter "brook" substance water amount 30 unit "m3/day"
flow Inlet -> Pond : matter "inflow" substance water
flow Pond -> Outlet : matter "outflow" substance water
flow Outlet -> Downstream : matter "outflow" substance water

param "stream" : flow Stream -> Inlet "brook" range 0..100
param "outlet time" : time constant of Pond range 1..40

metric "water passed downstream" : sum into Downstream

@lens mobus
