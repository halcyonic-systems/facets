# ── Home heating as a cybernetic control loop ────────────────────────
# A thermostat system is the textbook feedback loop: sense the variable,
# compare to a goal, act on the world, and let that action change the
# very variable being sensed. Mobus's systems-science reading foregrounds
# exactly this: control, feedback, and the flows that carry it.

system "Home Thermostat System" : Concrete/Technical
domain "Residential climate control"
level Structure

# The sensor perceives room temperature and turns it into a signal.
component Sensor primitive Sensing

# The thermostat compares the sensed value to a setpoint and switches
# the furnace accordingly — the modulating controller of the loop.
component Thermostat primitive Modulating

# The furnace combines fuel and air to produce heat — the actuator.
component Furnace primitive Combining interface

# Environment: where energy enters the system and where it is lost.
source "Gas Supply"
sink Outdoors

# Fuel enters from outside the boundary.
flow "Gas Supply" -> Furnace : matter "gas"

# The furnace's heat warms the space the sensor monitors, closing the loop...
flow Furnace -> Sensor : energy "heat"

# ...but some of that same heat escapes, which is why control is needed
# continuously rather than once.
flow Furnace -> Outdoors : energy "heat loss"

# The sensor reports the current temperature to the controller.
flow Sensor -> Thermostat : informational "temperature reading"

# The controller issues the corrective command back to the actuator.
flow Thermostat -> Furnace : informational "on/off signal"

@lens mobus