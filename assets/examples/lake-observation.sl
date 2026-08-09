# ── A Klir-native entry: a source system of observed variables ───────
# Klir's lens asks: which variables, on which scales, with which state
# sets, and which relations does the investigator define among them?
# Nothing here is a work process or a flow of substance — the relations
# are the investigator's, which is Klir's whole point (Facets Ch. 2).
# The directed annotations below are the observer's orientation
# commitment (Facets Ch. 4: "directed systems"), not causation the
# lake asserts. In Klir's hierarchy this sits at the SOURCE level:
# variables and observation channels, no generating rule declared.
#
# The kingdom/genus names the observed thing (a lake). The source
# system itself is the investigator's construct — decided 2026-08-05:
# name the object, state the construct here. The genus vocabulary has
# no Conceptual-friendly entry, and resolving that belongs to the
# level work (#288), not to this entry.

system "Lake Observation Study" : Concrete/Biological
domain "Seasonal monitoring of a lake: four variables an ecologist measures and the relations she defines among them"

# The header already names it: variables and observation channels, no
# generating rule declared (ratified 2026-08-08, #288; pairs with the
# corpus steel-plant, the same level reached from Mobus's side).
level Source

# The measured variables, with Klir's source-system metadata (#154):
# measurement scale and, for the support variable, its state set.
component WaterTemp kind Basic scale Interval
component AlgaeDensity kind Basic scale Ratio
component OxygenLevel kind Basic scale Ratio
component Season kind Support scale Nominal states {Spring, Summer, Autumn, Winter}

# Relations among variables. Deliberately UNTYPED: Klir does not ask
# what substance a relation carries — that question is Mobus's, and
# leaving it unanswered here is the point of the entry.
flow Season -> WaterTemp "drives"
flow WaterTemp -> AlgaeDensity "covaries with"
flow AlgaeDensity -> OxygenLevel "covaries with"
flow OxygenLevel -> AlgaeDensity "covaries with"

@lens klir
# The observer commits to an orientation on the first two relations
# only — the covariation pair below stays undirected, as measured.
@directed 1
@directed 2
