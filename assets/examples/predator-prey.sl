# ── A living stock-and-flow loop ─────────────────────────────────────
# Predator-prey dynamics are the ecologist's bathtub: populations are
# stocks (Buffering components) that fill from what they eat and drain
# through mortality. Here the "water" is biomass — energy captured from
# sunlight, passed up the food chain, and eventually lost to decay.

system "Predator-Prey Ecosystem" : Concrete/Biological

domain "Population dynamics of rabbits and foxes in a grassland"

level Structure

# Rabbits and Foxes are the two accumulating stocks in this system —
# their numbers rise and fall as biomass flows in and out. Both sit on
# the boundary because grazing/predation/death cross it directly.
component Rabbits primitive Buffering interface
component Foxes primitive Buffering interface

# Sunlight is the ultimate external source of all energy in the system.
source Sunlight

# Grass is neither pure source nor pure sink: it receives energy from
# sunlight AND gives matter to rabbits, so it's modeled as a generic
# environment element that mediates between the two.
environment Grass

# Foxes eventually die off; their biomass leaves the system for good.
sink Decomposition

# Sunlight drives grass regrowth — pure energy capture via photosynthesis.
flow Sunlight -> Grass : energy "photosynthesis"

# Rabbits graze grass, converting plant matter into rabbit biomass —
# this is what lets the Rabbits stock grow.
flow Grass -> Rabbits : matter "grazing"

# Foxes eat rabbits, converting prey biomass into predator biomass —
# this simultaneously depletes Rabbits and grows Foxes.
flow Rabbits -> Foxes : matter "predation"

# Foxes die off over time; their biomass exits the system entirely.
flow Foxes -> Decomposition : matter "mortality"

@lens mobus