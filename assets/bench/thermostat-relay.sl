# ── A thermostat and a room, on or off ──────────────────────────────────────
# bench · after the on–off (relay) thermostat — Mobus 2022 §11.2.1.1 "a simple thermostat"; Ashby 1956 (requisite variety)
#
# The same room as thermostat-room.sl with the regulator as a switch that
# has two settings: the agent watches the room's heat and, at or above the
# level, commands the switch shut (0); below it, open (1). No primitive can
# produce this curve: the heat climbs past the level by a whole hour's
# heating, falls back under it, and climbs again, a square wave in the
# command and a sawtooth in the room. That overshoot is the relay
# thermostat's signature, and the reason the proportional one exists. The
# level is a declared parameter like any setpoint.
system "Thermostat Room (relay)" : Concrete/Technical

domain "a room kept warm by a heater and an on-off thermostat"

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
agent Thermostat watches Room rule threshold above 2 emit 0 else 1 manages Switch
    description "Reads the room's heat; shut at or above the level, open below it."

source Grid
sink Outdoors

flow Grid -> Mains : energy "electricity" substance heat amount 2 unit "kWh/h"
flow Mains -> Switch : energy "electricity" substance heat
flow Switch -> Room : energy "heat" substance heat
flow Room -> Walls : energy "loss" substance heat
flow Walls -> Outdoors : energy "loss" substance heat

param "heater" : flow Grid -> Mains "electricity" range 0..8
param "insulation" : time constant of Room range 1..20
param "level" : above of Thermostat range 0.4..4

metric "heat lost" : sum into Outdoors

@lens mobus
