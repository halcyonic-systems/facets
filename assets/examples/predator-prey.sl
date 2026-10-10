# ── A living stock-and-flow loop ─────────────────────────────────────
# Predator-prey dynamics are the ecologist's bathtub: populations are
# stocks (Buffering components) that fill from what they eat and drain
# through mortality. Here the "water" is biomass — energy captured from
# sunlight, passed up the food chain, and eventually lost to decay.

system "Predator-Prey Ecosystem" : Concrete/Biological

domain "Population dynamics of rabbits and foxes in a grassland"

level Structure

# Rabbits and Foxes are the two accumulating stocks in this system —
# their numbers rise and fall as biomass flows in and out. Grazing and
# death cross the boundary, so each stock has a pass-way of its own: the
# pasture edge where rabbits graze, and the edge of the foxes' range where
# their biomass leaves.
component Rabbits primitive Buffering
    description "The rabbit population: grows as rabbits eat grass and shrinks as foxes eat rabbits."
component Foxes primitive Buffering
    description "The fox population: grows as foxes eat rabbits and shrinks through mortality."
interface "Pasture Edge"
    description "The edge of the pasture where rabbits graze, and where grass passes into the rabbits."
interface "Fox Range Edge"
    description "The edge of the foxes' range, where their biomass leaves the system."

# Sunlight is the ultimate external source of all energy in the system.
source Sunlight
    description "The sun, supplying the light that grass turns into growth."

# Grass is neither pure source nor pure sink: it receives energy from
# sunlight AND gives matter to rabbits, so it's modeled as a generic
# environment element that mediates between the two.
environment Grass
    description "The grassland: receives sunlight, grows, and supplies the grass that rabbits eat."

# Foxes eventually die off; their biomass leaves the system for good.
sink Decomposition
    description "Decay: where the biomass of dead foxes ends up outside the system."

# Sunlight drives grass regrowth — pure energy capture via photosynthesis.
flow Sunlight -> Grass : energy "photosynthesis" substance sunlight
    description "Sunlight captured by the grass through photosynthesis."

# Rabbits graze grass, converting plant matter into rabbit biomass —
# this is what lets the Rabbits stock grow.
flow Grass -> "Pasture Edge" : matter "grazing" substance grass
    description "Grass offered up at the edge of the pasture for rabbits to eat."
flow "Pasture Edge" -> Rabbits : matter "grazing" substance grass
    description "Grass eaten by rabbits, which becomes rabbit biomass."

# Foxes eat rabbits, converting prey biomass into predator biomass —
# this simultaneously depletes Rabbits and grows Foxes.
flow Rabbits -> Foxes : matter "predation" substance rabbits
    description "Rabbits eaten by foxes, which becomes fox biomass."

# Foxes die off over time; their biomass exits the system entirely.
flow Foxes -> "Fox Range Edge" : matter "mortality" substance foxes
    description "Foxes dying, their biomass heading for the edge of the range."
flow "Fox Range Edge" -> Decomposition : matter "mortality" substance foxes
    description "The biomass of dead foxes leaving the system to decay."

@lens mobus
