# corpus-entry: v1
# title: Goal-oriented systems — the Feedforward paradigm
# author: George Klir
# work: Facets of Systems Science, 2nd ed.
# year: 2001
# locus: Ch. 10 §10.2
# figure: Fig. 10.1
# teaches: The goal-seeking element reads the input variable, letting it anticipate the output rather than only react to it.
# omits: The essential relationship between x and y, the goal itself, and the partial ordering of the four paradigms by severity of restriction — none of which is structure.
# note: One of four siblings over ONE fixed composition. Klir varies only what the goal-seeking element is allowed to read; the diff between the four files is the whole lesson.
# note: Klir labels the elements A and B; the names here are his own prose terms for them ("goal-implementing element", "goal-seeking element"). x, y and z are his.
# note: Klir draws x and y as variables on wires, not as things. Rendering the wire's origin and destination as environment things is our construction — the block diagram has no other place to put them.
# note: No ontological type is asserted. Klir asserts none; these are design frames, and the kingdom would be ours rather than his.

system "Goal-Oriented System — Feedforward Paradigm"

component "Goal-Implementing Element"
component "Goal-Seeking Element"

source x
sink y

flow x -> "Goal-Implementing Element" : informational "x"
flow "Goal-Implementing Element" -> y : informational "y"
flow "Goal-Seeking Element" -> "Goal-Implementing Element" : informational "z"
flow x -> "Goal-Seeking Element" : informational "x"

@lens klir
