# ── A thermostat and a room: regulation with a little overshoot ─────────────
#
# One heat stock (the room), a heater on the mains, a loss through the walls
# and a feedback loop: the Probe reads the room (its gain is 0.5), the
# Thermostat is an Inverting comparator that reports setpoint minus reading,
# and the Switch opens in proportion to that demand, drawing only what it
# lets through. Start the room cold and the heat overshoots its resting level
# on the first hour, then settles at 1.67 kWh. Halve the insulation and a
# constant heater would halve the room's heat; the thermostat holds it to
# within about 14% of where it was, by opening the switch wider.
#
# Split form: the mains and the walls are the pass-ways; the room, the
# switch, the probe and the comparator are residents. The regulator is
# proportional only, so the room rests a little under the setpoint, the droop
# a real proportional thermostat has. The numbers are round so the ledger
# reads by eye; nothing here is a claim about any building.
system "Thermostat Room" : Concrete/Technical

domain "a room kept warm by a heater and a thermostat"

time unit hour

level Structure

interface Mains
    description "Where electricity comes in: the heater's supply."
interface Walls
    description "Where heat leaks out: the walls, the window, the door gap."

component Room primitive Buffering stock kWh initial 0.5 time constant 5
    description "The heat in the room; it leaks out at its size over 5 hours."
component Switch primitive Modulating backpressure
    description "Draws electricity from the mains only as far as the thermostat's demand."
component Probe primitive Sensing
    description "Reads the room's heat without removing any; its gain is half."
component Thermostat primitive Inverting setpoint 1
    description "Reports how far the reading is below the setpoint."

source Grid
sink Outdoors

flow Grid -> Mains : energy "electricity" substance heat amount 2 unit "kWh/h"
flow Mains -> Switch : energy "electricity" substance heat
flow Switch -> Room : energy "heat" substance heat
flow Room -> Walls : energy "loss" substance heat
flow Walls -> Outdoors : energy "loss" substance heat
flow Room -> Probe : informational "temperature"
flow Probe -> Thermostat : informational "reading"
flow Thermostat -> Switch : informational "demand"

param "heater" : flow Grid -> Mains "electricity" range 0..8
param "insulation" : time constant of Room range 1..20
param "setpoint" : setpoint of Thermostat range 0.2..2

metric "heat lost" : sum into Outdoors

@lens mobus
