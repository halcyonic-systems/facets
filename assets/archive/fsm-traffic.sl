# ── A finite-state controller, read structurally ─────────────────────
# Klir's lens asks: what is the STRUCTURE that generates the observed
# behavior? Here the behavior is "lights cycle, but can be interrupted."
# The structure is a state-holding Controller coupled to a Timer that
# paces its transitions, with inputs and outputs crossing the boundary.

system "Traffic Light Controller" : Concrete/Technical
domain "Intersection signal control: Green/Yellow/Red cycle, pedestrian-interruptible"

# The wiring is authored, the transition rule is not — the states live in a
# comment and no table is in the file. Its own header says it: the STRUCTURE
# that generates. Contrast parity-automaton (ratified 2026-08-08, #288).
level Structure

# The Controller is the state machine itself: it holds the current state
# (Green/Yellow/Red) and modulates its output based on incoming signals.
# `interface` marks it as touching the system boundary (it emits to the
# environment). `Modulating` marks it as the part that shapes behavior
# in response to inputs, not merely passing them through.
component Controller primitive Modulating interface

# The Timer is a separate structural element: it accumulates elapsed
# time and signals the Controller when a phase should end. `Buffering`
# because it is fundamentally a stock of elapsed time that fills and
# resets.
component Timer primitive Buffering

# Environment: where the interrupt comes from, where the output goes.
source PedestrianButton
sink LightOutput

# The Timer's tick is the normal, timer-driven trigger for a transition.
flow Timer -> Controller : informational "timer tick"

# The pedestrian button is an exogenous informational input that can
# force an early transition — the structural feature that makes this
# more than a pure timed cycle.
flow PedestrianButton -> Controller : informational "pedestrian request"

# The Controller resets the Timer whenever it changes state, closing the
# loop between the two internal components.
flow Controller -> Timer : informational "reset timer"

# The Controller's current state is emitted outward as the visible
# output of the whole structure.
flow Controller -> LightOutput : informational "state signal"

@lens klir