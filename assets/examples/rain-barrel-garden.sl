# ── A rain barrel and a garden bed: the bench's own model ───────────────────
#
# The smallest system in which every knob does something you can see. Two
# inflows (rain, sun), one stock (the barrel), one work process (the bed),
# one outflow (the harvest). Rain fills the barrel; the barrel waters the bed
# at a set rate; sunlight drives the bed's work and leaves as heat; produce
# accumulates at the harvest. Turn the rain down and the barrel drains; turn
# it up and the barrel overflows at its capacity; turn the sun off and the bed
# still passes water through, because a Combining sums what matches its
# output kind — until it is told to stall on its scarcest input.
#
# Built for the dynamics bench (facets#463): declared amounts, a stock with
# release and capacity, two sliders, one metric. Nothing here is a claim
# about horticulture; the numbers are round so the ledger reads by eye.
system "Rain Barrel Garden" : Concrete/Physical

domain "a rain barrel feeding a garden bed: two inflows, one stock, one work process, one harvest"

time unit day

level Structure

# Rain is the barrel's only supply; the Sun is the bed's energy. Both are
# unbounded sources until a reservoir says otherwise.
source Rain
source Sun

# The barrel holds water (litres), starts part full, releases a set amount a
# day to the bed, and overflows past 200 L — the overflow is dissipated by
# the ledger, which is what a full barrel in the rain does.
component "Rain Barrel" primitive Buffering interface stock L initial 60 release 12 capacity 200
    description "Holds rainwater; waters the bed at a set rate; overflows at 200 L."

# The bed combines water and light into produce. Its output is matter, so the
# water passes through as biomass and the light is spent as work (heat).
component "Garden Bed" primitive Combining interface
    description "Turns water and sunlight into produce; the light is spent, the water becomes biomass."

# Produce leaves the system when it is picked.
sink Harvest

flow Rain -> "Rain Barrel" : matter "rainfall" substance water amount 15 unit "L/day"
flow "Rain Barrel" -> "Garden Bed" : matter "watering" substance water
flow Sun -> "Garden Bed" : energy "sunlight" substance light amount 8 unit "kWh/day"
flow "Garden Bed" -> Harvest : matter "produce" substance biomass

# The two sliders a reader reaches for first.
param "rainfall" : flow Rain -> "Rain Barrel" "rainfall" range 0..40
param "sunlight" : flow Sun -> "Garden Bed" "sunlight" range 0..20

# The number the whole thing is for.
metric "harvest" : sum into Harvest

@lens mobus
