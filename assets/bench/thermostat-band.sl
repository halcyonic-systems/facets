# ── A thermostat and a room, on or off, with a dead band ────────────────────
# bench · after the on–off controller with hysteresis — Åström & Murray, Feedback Systems, 2008; Mobus 2022 §11.2.1.1
#
# The relay of thermostat-relay.sl with the band a real one has (facets#517):
# the switch shuts at or above 2.2 kWh, opens again under 1.8, and between
# the two keeps doing what it did last hour. That hold is the one bit of
# memory a relay carries, and it is what stops it chattering at a single
# level. At the hour step the bare relay overshoots by a whole hour's heating
# and the band barely shows (13 switches a day against 12); at a quarter-hour
# step, where the bare relay chatters (39 switches a day, room 1.91 to 2.39),
# the band cuts the switching to 29 and holds the room inside itself, 1.79
# to 2.21. Widen the band and the count falls again: the floor at 1.4 gives
# 9 switches a day at the hour step and 14 at the quarter hour. The levels
# are declared parameters like any setpoint.
system "Thermostat Room (band)" : Concrete/Technical

domain "a room kept warm by a heater and an on-off thermostat with a dead band"

time unit hour

level Structure

interface Mains
    description "Where electricity comes in: the heater's supply."
interface Walls
    description "Where heat leaks out: the walls, the window, the door gap."

component Room primitive Buffering stock kWh initial 0.5 time constant 5
    description "The heat in the room; it leaks out at its size over 5 hours."
component Switch primitive Modulating backpressure
    description "Draws electricity from the mains when the thermostat says so, all or nothing."
agent Thermostat watches Room rule threshold above 2.2 below 1.8 emit 0 else 1 manages Switch
    description "Reads the room's heat; shut at or above the ceiling, open under the floor, and between them whatever it was."

source Grid
sink Outdoors

flow Grid -> Mains : energy "electricity" substance heat amount 2 unit "kWh/h"
flow Mains -> Switch : energy "electricity" substance heat
flow Switch -> Room : energy "heat" substance heat
flow Room -> Walls : energy "loss" substance heat
flow Walls -> Outdoors : energy "loss" substance heat

param "heater" : flow Grid -> Mains "electricity" range 0..8
param "insulation" : time constant of Room range 1..20
param "ceiling" : above of Thermostat range 0.4..4
param "floor" : below of Thermostat range 0.2..4

metric "heat lost" : sum into Outdoors

@lens mobus
