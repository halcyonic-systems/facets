# corpus-entry: v1
# title: The human social system in the Ecos
# author: George Mobus
# work: Systems Science: Theory, Analysis, Modeling, and Design
# year: 2022
# locus: Ch. 7 §7.6.3
# figure: Fig. 7.17
# teaches: The last rung — the whole human enterprise as one SOI inside the Earth, and the only entry in the set whose lesson is an ABSENCE. Resources enter, wastes and heat leave, governance reads the environment and directs the work processes. What is missing is a product: "Notice what is not shown in the figure. There is no 'product' or 'service' output from the HSS returning something of value back to entities in the environment." Every subsystem of a supra-system owes it a function; open this model and count the outward flows that are not waste. There are none, and that is Mobus's finding, not a gap in the drawing.
# omits: The decomposition of the HSS, which Mobus defers to Ch. 9 ("we will decompose the HSS SOI into a few fuzzy subsystems. One of those systems is the economic system"). Also omitted is the individuation Mobus himself flags as the next step: "the stored energy source would be divided into, say, the three major fossil fuels", and each aggregated interface into the several real ones. And omitted is the Ecos as an SOI in its own right (Fig. 7.15, the whole Earth system) — here it survives only as the environmental entities the HSS draws on.
# note: Mobus states plainly that this figure is an aggregation, so the coarseness is his: "The figure is a cartoon representation of an environment and boundary analysis aggregating all inputs and outputs of each type into single arrows as well as sources and sinks being aggregated."
# note: The source names carry his distinction between two ways a resource runs out. Biological resources are FLOW-LIMITED — renewable "only if the draw-down rates are no greater than the production rates". Fossil fuels and ores are STOCK-LIMITED — "they can be used up". SL has no word for the difference, so it lives in the names, where nothing validates it.
# note: Governance is the second component on Mobus's own designation — Fig. 7.16 shows "the very important sub-subsystem of 'Governance'", and §7.6.3 makes it the decision agent: "The latter is considered as the agent that makes the decisions about how the HSS should behave relative to the resources and waste dumps." Both components carry `interface`: governance receives the message flows from outside, the work processes take the resources and pass the wastes.
# note: The disturbance is drawn as Fig. 7.17 draws it — global climate change, arising from the HSS's own CO₂ deposition and acting back on it. Its flow carries no kind clause: a disturbance in the caption is neither a resource nor a message, and typing it matter or energy would be our commitment.
# note: The messages are entered as three separate flows, one per resource source, because Mobus says what they carry: "The messages received provide some information regarding the quality and capacity of the resources and their flows." A single aggregated message flow would lose which resource is being reported on.
# set: Complex → CAS → CAES

system "The Human Social System" : Concrete/Social
domain "the human social system in the Earth supra-system"

component "Governance" interface
component "Work Processes" interface

source "Flow-Limited Biological Resources"
source "Stock-Limited Energy Resources"
source "Stock-Limited Material Resources"
source "Global Climate Change"
sink "Waste Dumps"
sink "Heat Dump"

flow "Flow-Limited Biological Resources" -> "Work Processes" : matter "food, wood, fiber — renewed by solar energy, and only at its rate"
flow "Stock-Limited Energy Resources" -> "Work Processes" : energy "hydrocarbon and carbonaceous fuels, drawn from a fixed stock"
flow "Stock-Limited Material Resources" -> "Work Processes" : matter "ores and minerals, concentrated on geological time scales"
flow "Work Processes" -> "Waste Dumps" : matter "wastes, many of them completely foreign — including the CO₂ put into the atmosphere"
flow "Work Processes" -> "Heat Dump" : energy "heat, radiated back into space"
flow "Flow-Limited Biological Resources" -> "Governance" : informational "messages on the quality and capacity of the biological resource and its flow"
flow "Stock-Limited Energy Resources" -> "Governance" : informational "messages on the quality and capacity of the energy stock"
flow "Stock-Limited Material Resources" -> "Governance" : informational "messages on the quality and capacity of the material stock"
flow "Governance" -> "Work Processes" : informational "decisions on what the internal work processes should be doing"
flow "Global Climate Change" -> "Work Processes" "the disturbance — global climate change, returning from the HSS's own waste disposal"

@lens mobus
