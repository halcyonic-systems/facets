# ── Cellular Energy Metabolism ───────────────────────────────────────
# Every cell is a small energy-conversion system: raw materials cross
# the boundary, get combined into usable energy, and byproducts leave.
# This fixture shows a Combining component feeding a Buffering stock —
# the metabolic engine and its energy reservoir.

system "Cell Energy Metabolism" : Concrete/Biological

domain "Aerobic cellular respiration and ATP storage"

# The mitochondria is the work process: it combines two inputs
# (glucose, oxygen) into two outputs (ATP, CO2).
component Mitochondria primitive Combining

# The ATP pool is the cytoplasmic stock that accumulates the cell's
# usable energy currency. `interface` marks it as boundary-adjacent,
# since ATP produced here is drawn down elsewhere in the cell.
component "ATP Pool" primitive Buffering interface

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