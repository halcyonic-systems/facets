# ── Jung's cognitive function stack ──────────────────────────────────
# Jung's theory of psychological types holds that a person's conscious
# orientation is organized by four functions arranged in a hierarchy:
# dominant, auxiliary, tertiary, inferior. Each claims a decreasing share
# of available psychic energy (libido). Two of the functions perceive
# (take in information) and two judge (decide/evaluate); together they
# regulate the flow of energy and information between psyche and world.

system "Jungian Cognitive Function Stack" : Conceptual/Social

domain "Jung's model of dominant/auxiliary/tertiary/inferior functions regulating psychic energy exchange with the outer world"

level Structure

# The reservoir of undifferentiated psychic energy (libido) that the
# dominant function claims first and most fully.
source "Libido Reservoir"

# Everything the psyche perceives and acts upon.
environment "Outer World"

# The psyche's two points of contact, as pass-ways (#472 split form):
# attention is where the world's information enters consciousness, and
# the libido uptake is where undifferentiated energy enters the stack.
# Neither transforms what crosses; the functions behind them do.
interface Attention
    description "Where perception enters: the conscious attention through which the world reaches the dominant function."
interface "Libido Uptake"
    description "Where psychic energy enters the function stack, to be claimed by the dominant first."

# The dominant function claims the largest share of energy and directs
# it most forcefully — it amplifies whichever orientation (perceiving or
# judging) the type favors. It is the first process behind the boundary,
# not the boundary itself: attention and uptake are the pass-ways.
component Dominant primitive Amplifying

# The auxiliary supports the dominant, tempering and balancing it —
# modulating the energy the dominant does not consume.
component Auxiliary primitive Modulating interface

# The tertiary function receives still less energy; it is underdeveloped
# and tends to impede rather than drive conscious activity.
component Tertiary primitive Impeding

# The inferior function receives the least energy and is largely
# unconscious, yet it still touches the boundary: under stress it erupts
# into contact with the outer world in primitive, undifferentiated form.
component Inferior primitive Impeding interface

# Psychic energy is conserved as it cascades down the hierarchy: the
# dominant takes its share first, passing the residue onward.
flow "Libido Reservoir" -> "Libido Uptake" : energy "psychic energy investment"
flow "Libido Uptake" -> Dominant : energy "psychic energy investment"
flow Dominant -> Auxiliary : energy "residual energy"
flow Auxiliary -> Tertiary : energy "residual energy"
flow Tertiary -> Inferior : energy "residual energy"

# Perceiving happens at the boundary: the dominant (here, the leading
# orientation) takes in information from the world.
flow "Outer World" -> Attention : informational "perception"
flow Attention -> Dominant : informational "perception"

# Judging happens at the boundary too: the auxiliary function evaluates
# and issues decisions back out into the world.
flow Auxiliary -> "Outer World" : informational "judgment"

# The inferior function, though weakest, can still break through to the
# boundary — Jung's account of the "inferior function eruption" under
# stress, where the least-regulated function briefly seizes control.
flow Inferior -> "Outer World" : informational "inferior eruption"

@lens mobus
