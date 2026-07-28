# corpus-entry: v1
# title: Goal-oriented systems — the Full-information paradigm
# set: Goal-oriented paradigms
# author: George Klir
# work: Facets of Systems Science, 2nd ed.
# year: 2001
# locus: Ch. 10 §10.2
# figure: Fig. 10.1
# teaches: The least restrictive paradigm: the goal-seeking element reads both the input and the output, combining anticipation with reaction.
# omits: The essential relationship between x and y, the goal itself, and the partial ordering of the four paradigms by severity of restriction — none of which is structure.
# note: One of four siblings over ONE fixed composition. Klir varies only what the goal-seeking element is allowed to read; the diff between the four files is the whole lesson.
# note: Klir partially orders the four paradigms "by the severity of their restrictions", and states that feedback and feedforward are NOT COMPARABLE. Gallery order is not a ranking: informationless is the most restrictive and full-information the least, but the two middle paradigms are incomparable to each other.
# note: Klir labels the elements A and B; the names here are his own prose terms for them ("goal-implementing element", "goal-seeking element"). x, y and z are his.
# note: Klir draws x and y as variables on wires, not as things. Rendering the wire's origin and destination as environment things is our construction — the block diagram has no other place to put them.
# note: No ontological type is asserted. Klir asserts none; these are design frames, and the kingdom would be ours rather than his.
# note: Direction is asserted on every relation (@directed): Fig. 10.1 is an arrowed block diagram and the teaches line above names who reads what — the direction is Klir's commitment, not ours. Without it the feedback and feedforward siblings are graph-isomorphic and the set collapses (#216).
# note: y is declared `environment`, not `sink`: the goal-implementing element writes it AND the goal-seeking element reads it, so it terminates nothing. The earlier `sink y` was contradicted by the entry's own feedback tap — it once round-tripped as `source y` (#216).

system "Goal-Oriented System — Full-information Paradigm"

component "Goal-Implementing Element"
component "Goal-Seeking Element"

source x
environment y

flow x -> "Goal-Implementing Element" : informational "x"
flow "Goal-Implementing Element" -> y : informational "y"
flow "Goal-Seeking Element" -> "Goal-Implementing Element" : informational "z"
flow x -> "Goal-Seeking Element" : informational "x"
flow y -> "Goal-Seeking Element" : informational "y"

@lens klir
@directed 1
@directed 2
@directed 3
@directed 4
@directed 5
