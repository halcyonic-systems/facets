# ── Respiring Cell ───────────────────────────────────────────────────
# The thing here is a CELL, not the metabolism it performs. Metabolism
# is what this system does; the system is the cell that does it, and it
# is drawn by exactly two residents — the mitochondria that respire and
# the ATP pool that holds what they make — sitting in a bloodstream.
# Renamed from "Cell Energy Metabolism" (#318): a process name on a
# system is the same source/process/system confusion as #313, and it
# had come to rest in our own library.

system "Respiring Cell" : Concrete/Biological

domain "Aerobic cellular respiration and ATP storage"

level Structure

# The mitochondria is the work process: it combines two inputs
# (glucose, oxygen) into two outputs (ATP, CO2). It carries `interface`
# because every boundary-crossing flow in this model terminates on it —
# glucose and oxygen in, CO2 out.
component Mitochondria primitive Combining interface

# The ATP pool is the cytoplasmic stock that accumulates the cell's
# usable energy currency. It carries no `interface`: the ATP stored here
# is drawn down elsewhere INSIDE the cell, so nothing it gates crosses
# the boundary, and an interface is individuated by the crossing flow it
# transports.
component "ATP Pool" primitive Buffering

# The bloodstream is the environment: it supplies fuel and oxidant,
# and absorbs the waste product. One environment entity can act as
# both source and sink across different flows.
environment Bloodstream

# Inputs: raw materials crossing in from the bloodstream.
flow Bloodstream -> Mitochondria : matter "glucose"
flow Bloodstream -> Mitochondria : matter "oxygen"

# Outputs: mitochondria produce ATP (stored) and CO2 (expelled).
flow Mitochondria -> "ATP Pool" : matter "ATP"
flow Mitochondria -> Bloodstream : matter "CO2"

@lens mobus