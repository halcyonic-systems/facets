# corpus-entry: v1
# title: A "typical" neuron
# author: George Mobus
# work: Systems Science: Theory, Analysis, Modeling, and Design
# year: 2022
# locus: Ch. 7 §7.3.2–§7.3.3.1
# figure: Figs. 7.7 and 7.8
# teaches: The second rung — a COMPLEX ADAPTIVE system at the same level 1 as the computer, and the diff against it is the lesson. The composition is no larger, but the environment is now made of things of the SAME KIND as the SOI (other neurons are its sources and sinks), and one flow runs backwards: the membrane feeds its temporal correlation back to the synapses, which is where adaptation lives. A synapse's response strength "depends on the history of activations at each one" — history, in a structural model, shows up only as that returning edge.
# omits: The level-2 decomposition of the synapse, which is where Mobus's own research sits (the Adaptrode; Mobus 1994, 1999, 2000). The potentiation cascade — burst, secondary signal, short-term trace, slow-decaying second potentiation — is dynamics, and §7.3.3.2 gives it in prose only. Also omitted, at Mobus's explicit direction, is everything that makes the neuron a living CELL: "all of the factors that are involved in any living cell such as nutrient obtaining and waste disposal will be left out of our current interest." So there is no metabolic source and no waste sink here.
# note: The three level-1 subsystems are named verbatim in §7.3.3.1: "the set of synapses…, the polarization/depolarization processing of the cell membrane, and the axonal hillock". Fig. 7.8 also draws a fourth oval subsuming "all the other living cell functions that keep the neuron alive"; it is not authored, because the figure gives it no channels and §7.3.2 has already excluded what would flow through them.
# note: The synapses and the hillock carry `interface` on Mobus's own word: "Each synapse is an interface between the incoming signal and the receiving neuron system", and the hillock is "the neuron output processor". They are the only two components any boundary-crossing flow touches.
# note: Every flow is `informational`. This is Mobus's framing, not a convenience — "The interest here is communications between neurons." The physical carriers differ (an action potential is a wave of depolarization, a neurotransmitter is a molecule crossing a cleft), and that difference is a level-2 fact about the interface protocol, not about what is flowing at level 1.
# note: The secondary signal has two possible origins in the text — "either from the cell itself or from external sources such as neuromodulators" — and only the external one is representable at this level, since the internal one would need the cell subsystem the figure leaves empty. It is entered as an environmental source and the ambiguity recorded here.

system "A Typical Neuron" : Concrete/Biological
domain "Neurobiology"

component "Synaptic Compartments" interface
component "Cell Membrane"
component "Axonal Hillock" interface

source "Source Neurons"
source "Neuromodulatory Sources"
sink "Target Neurons"

flow "Source Neurons" -> "Synaptic Compartments" : informational "action potentials on afferent axonal terminals"
flow "Neuromodulatory Sources" -> "Synaptic Compartments" : informational "the secondary signal — that this burst is meaningful"
flow "Synaptic Compartments" -> "Cell Membrane" : informational "depolarization state"
flow "Cell Membrane" -> "Synaptic Compartments" : informational "internal feedback on the temporal correlation of inputs"
flow "Cell Membrane" -> "Axonal Hillock" : informational "the summed depolarization state, Σ"
flow "Axonal Hillock" -> "Target Neurons" : informational "the outgoing action potential, if threshold is reached"

@lens mobus
