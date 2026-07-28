# ── A watershed: one system, every conservation channel visible ──────
# Rain falls, a reservoir stores it, treatment moves it to the city and
# loses some on the way. Run this and the conservation ledger separates
# into all four channels at once: emitted (rainfall), stored (reservoir
# level rising), sunk (water delivered), dissipated (treatment losses).
# Mass balances exactly — the chart is the proof.

system "Watershed" : Concrete/Physical

domain "Rainfall captured by a reservoir and delivered to a city through lossy treatment"

time unit day

# The reservoir is the system's memory: a Buffering stock measured in
# megaliters. It fills faster than it drains, so the level climbs —
# storage is what a watershed IS.
component Reservoir primitive Buffering interface stock ML

# Treatment is transport with losses (Propelling): pumping and
# filtration pass water onward but spend part of the flow doing it —
# the classic transport cost, dissipated as the Second Law demands.
# `interface` because the municipal supply crosses the boundary here.
component Treatment primitive Propelling interface

# Environment: weather above, the city below.
source Rain
sink City

# Rainfall is the driving flow: 3 ML/day into the reservoir. The only
# declared magnitude in the model — everything downstream is release
# and transport, set by the stock's own outflow.
flow Rain -> Reservoir : matter "rainfall" substance water amount 3 unit ML/day

# Controlled release from the dam into treatment.
flow Reservoir -> Treatment : matter "controlled release"

# Treated water delivered to the city — what actually arrives.
flow Treatment -> City : matter "municipal supply"

@lens mobus
