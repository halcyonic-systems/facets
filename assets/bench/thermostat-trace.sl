# ── A thermostat and a room, with a memory ──────────────────────────────────
# bench · after the homeostatic regulator over a moving average — Mobus 2022 §11.2.1.1
#
# The same room as thermostat-agent.sl with the regulator written as a trace
# agent: it remembers its last three readings and runs the proportional rule
# over their mean, gain · (target − mean), instead of over the reading alone.
# Mobus's adaptive reactive agent "tracks the input variables and responds in
# kind"; the window is its experiential memory, and the engine keeps it as
# run state, written after each decision. Averaging makes the agent slower to
# believe the room: against thermostat-agent.sl it overshoots further (room
# 2.32 kWh at hour 2 against 1.90 at hour 1), falls to 1.31 at hour 6 where
# the memoryless agent never dips under 1.62, and settles later (within 1%
# of 1.6667 from hour 26 against hour 3), at the same resting level. A
# longer memory rings longer: window 2 settles by hour 12, 4 by hour 50, 6
# not within 72 hours. With `window` 1 the mean is the reading and the file
# traces thermostat-agent.sl digit for digit, which is the control.
system "Thermostat Room (trace)" : Concrete/Technical

domain "a room kept warm by a heater and a thermostat that remembers"

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
agent Thermostat watches Room rule trace window 3 target 2 gain 0.5 manages Switch
    description "Reads the room's heat, averages its last three readings, decides how far to open the switch."

source Grid
sink Outdoors

flow Grid -> Mains : energy "electricity" substance heat amount 2 unit "kWh/h"
flow Mains -> Switch : energy "electricity" substance heat
flow Switch -> Room : energy "heat" substance heat
flow Room -> Walls : energy "loss" substance heat
flow Walls -> Outdoors : energy "loss" substance heat

param "heater" : flow Grid -> Mains "electricity" range 0..8
param "insulation" : time constant of Room range 1..20
param "memory" : window of Thermostat range 1..12
param "setpoint" : target of Thermostat range 0.4..4
param "sensitivity" : gain of Thermostat range 0.1..2

metric "heat lost" : sum into Outdoors

@lens mobus
