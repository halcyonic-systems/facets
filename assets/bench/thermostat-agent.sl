# ── A thermostat and a room, the agent way ──────────────────────────────────
# bench · after the cybernetic regulator (thermostat-room.sl) as one agent — Mobus 2022 ch. 11
#
# The same room as thermostat-room.sl with the regulator written as one
# agent instead of a probe and a comparator. The agent watches the room's
# heat, runs the proportional rule gain · (target − level), and commands the
# switch. Target 2 at gain 0.5 is the same demand the probe at gain 0.5 and
# the comparator at setpoint 1 produce (1 − level/2), so the two files trace
# the same curve: cold start at 0.5 kWh, overshoot, settle at 1.67. That
# equality is the point of the file; it is the control for the agent form
# (ADR 0008 D3). The agent's goal is a declared parameter like any setpoint.
system "Thermostat Room (agent)" : Concrete/Technical

domain "a room kept warm by a heater and a thermostat that decides"

time unit hour

level Structure

interface Mains
    description "Where electricity comes in: the heater's supply."
interface Walls
    description "Where heat leaks out: the walls, the window, the door gap."

component Room primitive Buffering stock kWh initial 0.5 time constant 5
    description "The heat in the room; it leaks out at its size over 5 hours."
component Switch primitive Modulating backpressure
    description "Draws electricity from the mains only as far as the thermostat's command."
agent Thermostat watches Room rule proportional target 2 gain 0.5 manages Switch
    description "Reads the room's heat, decides how far to open the switch."

source Grid
sink Outdoors

flow Grid -> Mains : energy "electricity" substance heat amount 2 unit "kWh/h"
flow Mains -> Switch : energy "electricity" substance heat
flow Switch -> Room : energy "heat" substance heat
flow Room -> Walls : energy "loss" substance heat
flow Walls -> Outdoors : energy "loss" substance heat

param "heater" : flow Grid -> Mains "electricity" range 0..8
param "insulation" : time constant of Room range 1..20
param "setpoint" : target of Thermostat range 0.4..4
param "sensitivity" : gain of Thermostat range 0.1..2

metric "heat lost" : sum into Outdoors

@lens mobus
