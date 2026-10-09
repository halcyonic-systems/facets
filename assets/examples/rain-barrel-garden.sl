# ── A rain barrel and a garden bed: the bench's own model ───────────────────
#
# The smallest system in which every knob does something you can see. Two
# inflows (rain, sun), one stock (the barrel), one work process (the bed),
# one outflow (the harvest). Rain comes in through the gutter and fills the
# barrel; the barrel waters the bed at a set rate; sunlight comes in through
# the canopy and drives the bed's work, leaving as heat; produce goes out
# through the gate. Turn the rain down and the barrel drains; turn it up and
# the barrel overflows at its capacity; turn the sun off and the bed still
# passes water through, because a Combining sums what matches its output
# kind — until it is told to stall on its scarcest input.
#
# Drawn in the split form (#226): the pass-ways — gutter, canopy, gate — are
# the interfaces in the boundary, and the barrel and the bed are residents
# that no crossing touches. Built for the dynamics bench (facets#463):
# declared amounts, a stock with release and capacity, two sliders, one
# metric. Nothing here is a claim about horticulture; the numbers are round
# so the ledger reads by eye.
system "Rain Barrel Garden" : Concrete/Physical

domain "a rain barrel feeding a garden bed: two inflows, one stock, one work process, one harvest"

time unit day

level Structure

# The pass-ways in the boundary: where rain, light and produce cross.
interface Gutter
    description "Where the rain comes in: the roof's run-off, channelled to the barrel."
interface Canopy
    description "Where the light comes in: the open sky over the bed."
interface Gate
    description "Where the produce goes out: picked and carried off."

# The residents. The barrel holds water (litres), starts part full, releases a
# set amount a day to the bed, and overflows past 200 L — the overflow is
# dissipated by the ledger, which is what a full barrel in the rain does. The
# bed combines water and light into produce: the water passes through as
# biomass, the light is spent as work (heat).
component "Rain Barrel" primitive Buffering stock L initial 60 release 12 capacity 200
    description "Holds rainwater; waters the bed at a set rate; overflows at 200 L."
component "Garden Bed" primitive Combining
    description "Turns water and sunlight into produce; the light is spent, the water becomes biomass."

# Rain is the barrel's only supply; the Sun is the bed's energy; the harvest
# is where produce leaves.
source Rain
source Sun
sink Harvest

flow Rain -> Gutter : matter "rainfall" substance water amount 15 unit "L/day"
flow Gutter -> "Rain Barrel" : matter "run-off" substance water
flow "Rain Barrel" -> "Garden Bed" : matter "watering" substance water
flow Sun -> Canopy : energy "sunlight" substance light amount 8 unit "kWh/day"
flow Canopy -> "Garden Bed" : energy "light" substance light
flow "Garden Bed" -> Gate : matter "produce" substance biomass
flow Gate -> Harvest : matter "picked" substance biomass

# The two sliders a reader reaches for first.
param "rainfall" : flow Rain -> Gutter "rainfall" range 0..40
param "sunlight" : flow Sun -> Canopy "sunlight" range 0..20

# The number the whole thing is for.
metric "harvest" : sum into Harvest

@lens mobus
