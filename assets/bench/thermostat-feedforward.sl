# ── A room whose heater supply is measured on the way in ────────────────────
# bench · after feedforward disturbance compensation — Mobus 2022 §12.3.2.3
#
# The room of thermostat-room.sl with no thermostat on its heat. The
# disturbance is the supply: the grid can deliver more than the room is
# meant to take, and the regulator here reads that supply as it arrives
# instead of reading the room. Mobus §12.3.2.3: feedforward control works
# by "measuring the value of inputs as compared with ideal values", so it
# acts before the disturbance reaches the level. The compensator watches
# the flow from the grid and, when the supply is at or above 3, opens the
# switch half way; below that, all the way. The switch sheds what it does
# not pass, so the compensator's own decision never changes the flow it
# reads: a measured disturbance, not a loop. It reads the supply one hour
# late, as a level is read, so a step in the supply reaches the room for
# exactly one hour before it is compensated.
system "Thermostat Room (feedforward)" : Concrete/Technical

domain "a room whose heating is compensated for a measured change in its supply"

time unit hour

level Structure

interface Mains
    description "Where electricity comes in: the heater's supply."
interface Walls
    description "Where heat leaks out: the walls, the window, the door gap."

component Room primitive Buffering stock kWh initial 10 time constant 5
    description "The heat in the room; it leaks out at its size over 5 hours."
component Switch primitive Modulating
    description "Passes the share of the supply the compensator sets; the rest is shed."

source Grid
sink Outdoors

flow Grid -> Mains : energy "electricity" substance heat amount 2 unit "kWh/h"
flow Mains -> Switch : energy "electricity" substance heat
flow Switch -> Room : energy "heat" substance heat
flow Room -> Walls : energy "loss" substance heat
flow Walls -> Outdoors : energy "loss" substance heat

param "heater" : flow Grid -> Mains "electricity" range 0..8

agent Compensator watches flow Grid -> Mains "electricity" rule threshold above 3 emit 0.5 else 1 manages Switch
    description "Reads the supply as it arrives; halves the switch while the supply is at or above 3."
param "compensates at" : above of Compensator range 0.5..8

metric "heat lost" : sum into Outdoors

@lens mobus
