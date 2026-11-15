# Water tower: a float and a controller keep the tank near its mark.
#
# Domain: feedback control, a town water tower with an inlet valve.
# Shape: a closed loop. Stock, sensor, comparator, valve, and back into
# the stock (negative feedback toward a setpoint).
#
# Mains       supplies up to 10 m3 an hour.
# Inlet Valve opens as far as the controller says (Modulating, between
#             closed at 0 and fully open at 1). With backpressure, water it
#             does not let in stays in the mains instead of being spilled.
# Tower       is the water held (Buffering). The town draws from it in
#             proportion to how full it is (time constant 4 hours).
# Float       reads the level without taking any water (Sensing, gain 0.1:
#             it reports a tenth of the level, so 10 m3 reads as 1).
# Controller  compares the reading to its setpoint (Inverting, setpoint 1)
#             and asks for setpoint minus reading.
#
# What to expect: with no control the tower would fill toward 10 x 4 = 40.
# The loop holds it at 8 m3, a little under the 10 m3 mark; that droop
# is what a proportional controller does. The tower starts empty, the valve
# starts wide open, the level overshoots to 10 in the first hour, and the
# loop settles it at 8 within about five hours.
#
# The float reads the tower over an informational flow. Declared as matter
# (as docs/authoring-models.md advises) the engine treats it as a second
# drain and the float swallows half the tower's outflow; see README.
#
# Knobs to try:
#   - the controller setpoint (1). At 0.5 the tower settles near 4; at 2
#     the valve sits nearer fully open and the tower settles near 16.
#   - the float gain (0.1). A twitchier float (0.5) reads five times more
#     per m3. In continuous time the tower would settle near 1.9. With one
#     hour steps the loop overreacts instead: the valve slams between shut
#     and partly open and the level chatters between about 1.6 and 3.1.
#     Run with --dt 0.1 and it settles at 1.9. Too much gain for the loop's
#     delay is a real control lesson, and here the step size is the delay.
system "Water Tower" : Concrete/Technical

domain "a town water tower held near its mark by a float and a valve"

time unit h

source Mains
    description "The water main feeding the tower."
sink Town
    description "The homes drawing water."

component "Inlet Valve" primitive Modulating backpressure interface
    description "Opens as far as the controller asks."
component Tower primitive Buffering stock m3 initial 0 time constant 4
    description "The water in the tower; the town draws it at its level over 4 hours."
component Float primitive Sensing gain 0.1
    description "Reads the level without taking water; reports a tenth of it."
component Controller primitive Inverting setpoint 1
    description "Asks for the setpoint minus the reading."
interface Taps
    description "Where water leaves the tower for the town."

flow Mains -> "Inlet Valve" : matter "supply" substance water amount 10 unit "m3/h"
flow "Inlet Valve" -> Tower : matter "fill" substance water
flow Tower -> Taps : matter "draw" substance water
flow Taps -> Town : matter "draw" substance water
flow Tower -> Float : informational "level reading"
flow Float -> Controller : informational "reading"
flow Controller -> "Inlet Valve" : informational "opening"

param "mains supply" : flow Mains -> "Inlet Valve" "supply" range 0..40
param "setpoint" : setpoint of Controller range 0.1..3
param "draw time" : time constant of Tower range 1..20

metric "water delivered to town" : sum into Town

@lens mobus
