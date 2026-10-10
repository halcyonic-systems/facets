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
    description "The pool of undifferentiated psychic energy that the dominant function draws on first."

# Everything the psyche perceives and acts upon.
environment "Outer World"
    description "Everything the psyche perceives and acts upon, outside the conscious boundary."

# The psyche's two points of contact, as pass-ways (#472 split form):
# attention is where the world's information enters consciousness, and
# the libido uptake is where undifferentiated energy enters the stack.
# Neither transforms what crosses; the functions behind them do.
interface Attention
    description "Where perception enters: the conscious attention through which the world reaches the dominant function."
interface "Libido Uptake"
    description "Where psychic energy enters the function stack, to be claimed by the dominant first."

# The two exits, as pass-ways of their own: judgment leaves through one,
# the inferior's eruption through the other. Neither transforms what
# crosses; the auxiliary and the inferior do that work behind them.
interface "Judgment Outlet"
    description "Where judgment leaves: the pass-way through which the auxiliary's decisions reach the outer world."
interface "Eruption Outlet"
    description "Where the inferior breaks through: the pass-way through which its primitive output reaches the outer world under stress."

# The dominant function claims the largest share of energy and directs
# it most forcefully — it amplifies whichever orientation (perceiving or
# judging) the type favors. It is the first process behind the boundary,
# not the boundary itself: attention and uptake are the pass-ways.
component Dominant primitive Amplifying
    description "The function that claims the largest share of energy and directs it most forcefully, amplifying the orientation the type favors."

# The auxiliary supports the dominant, tempering and balancing it —
# modulating the energy the dominant does not consume.
component Auxiliary primitive Modulating
    description "The function that supports the dominant, tempering and balancing the energy the dominant does not consume, and issuing judgments to the world."

# The tertiary function receives still less energy; it is underdeveloped
# and tends to impede rather than drive conscious activity.
component Tertiary primitive Impeding
    description "The underdeveloped function that receives still less energy and tends to impede conscious activity rather than drive it."

# The inferior function receives the least energy and is largely
# unconscious, yet it still touches the boundary: under stress it erupts
# into contact with the outer world in primitive, undifferentiated form.
component Inferior primitive Impeding
    description "The weakest, largely unconscious function: it receives the least energy and can break through to the outer world under stress."

# Psychic energy is conserved as it cascades down the hierarchy: the
# dominant takes its share first, passing the residue onward.
flow "Libido Reservoir" -> "Libido Uptake" : energy "psychic energy investment" substance libido
    description "Undifferentiated psychic energy passing from the reservoir into the uptake pass-way."
flow "Libido Uptake" -> Dominant : energy "psychic energy investment" substance libido
    description "The full energy investment handed from the uptake to the dominant, which claims its share first."
flow Dominant -> Auxiliary : energy "residual energy" substance libido
    description "The energy the dominant does not consume, passed on to the auxiliary."
flow Auxiliary -> Tertiary : energy "residual energy" substance libido
    description "The energy the auxiliary does not consume, passed on to the tertiary."
flow Tertiary -> Inferior : energy "residual energy" substance libido
    description "The last residue of energy, passed from the tertiary to the inferior."

# Perceiving happens at the boundary: the dominant (here, the leading
# orientation) takes in information from the world.
flow "Outer World" -> Attention : informational "perception" substance information
    description "What the world presents to consciousness, arriving at the attention pass-way."
flow Attention -> Dominant : informational "perception" substance information
    description "Perceived information handed from attention to the dominant function."

# Judging leaves through its own pass-way: the auxiliary function evaluates
# and issues decisions back out into the world.
flow Auxiliary -> "Judgment Outlet" : informational "judgment" substance information
    description "Decisions and evaluations the auxiliary hands to the judgment outlet."
flow "Judgment Outlet" -> "Outer World" : informational "judgment" substance information
    description "The judgment passing out into the world, unaltered by the outlet."

# The inferior function, though weakest, can still break through the
# boundary — Jung's account of the "inferior function eruption" under
# stress, where the least-regulated function briefly seizes control.
flow Inferior -> "Eruption Outlet" : informational "inferior eruption" substance information
    description "The primitive, undifferentiated output the inferior hands to the eruption outlet under stress."
flow "Eruption Outlet" -> "Outer World" : informational "inferior eruption" substance information
    description "The eruption passing out into the world, unaltered by the outlet."

@lens mobus
