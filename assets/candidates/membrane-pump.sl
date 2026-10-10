# ── A cell and its sodium pump: holding the line against a leak ─────────────
#
# Sodium leaks into the cell at 1 mM a minute through a channel. The pump sits
# in the membrane and is itself the pass-way out: it opens in proportion to
# the sodium it is told about (the Meter reads the cytosol, its gain is 0.5),
# up to a capacity of 1.5 mM a minute. With that headroom the cytosol settles
# at 1.33 mM and stays there. Cut the pump capacity at minute 6 and the
# resting level climbs: 1.2 settles at 1.67, 1.0 just reaches 2.0, and 0.8,
# below the leak, never settles: the cytosol gains 0.2 mM every minute for as
# long as it runs. The cliff sits where capacity meets the leak.
#
# The pump is drawn as one component that is both a Modulating gate and the
# pass-way (the merged form); it stores nothing and transforms nothing, so
# the Mobus lens has no complaint. The channel is a plain pass-way. The
# numbers are round so the ledger reads by eye; nothing here is a claim about
# any cell.
system "Membrane Pump" : Concrete/Biological

domain "a cell holding its sodium down against a leak"

time unit minute

level Structure

interface Channel
    description "Where sodium leaks in: the open channels in the membrane."

component Cytosol primitive Buffering stock mM initial 1 release 1.5
    description "Sodium inside the cell; the pump may take up to 1.5 mM a minute from it."
component Pump primitive Modulating interface backpressure
    description "The membrane pump: opens in proportion to the sodium reading and passes the sodium out."
component Meter primitive Sensing
    description "Reads the cytosol without taking any; its gain is half."

environment Bath

flow Bath -> Channel : matter "leak" substance sodium amount 1 unit "mM/min"
flow Channel -> Cytosol : matter "leak" substance sodium
flow Cytosol -> Pump : matter "pumped" substance sodium
flow Pump -> Bath : matter "pumped out" substance sodium
flow Cytosol -> Meter : informational "sodium level"
flow Meter -> Pump : informational "load"

param "leak" : flow Bath -> Channel "leak" range 0..8
param "pump capacity" : release of Cytosol range 0..8

metric "pumped out" : sum into Bath

@lens mobus
