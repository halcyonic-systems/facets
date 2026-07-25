# corpus-entry: v1
# title: The mammalian brain — the afferent visual path
# author: George Mobus
# work: Systems Science: Theory, Analysis, Modeling, and Design
# year: 2022
# locus: Ch. 7 §7.4.4–§7.4.5
# figure: Figs. 7.12 and 7.13
# teaches: The third rung — a COMPLEX ADAPTIVE AND EVOLVABLE system, and the one entry in this set that does not close. Mobus walks a single message path into the brain and stops; the model stops with him, and the last cortical stage is left hanging. What the reader should notice is that the boundary is the hard part here, not the components: the brain is "a system that has a seemingly clear physical boundary but in fact is so highly porous and fuzzy that identification of real boundaries is a major challenge" (§7.1), and it is footnote 8, not any figure, that finally fixes it — brain proper is the SOI, the rest of the CNS and all of the PNS are sources and sinks.
# omits: THE ENTIRE EFFERENT SIDE — motor control and glandular control — which is what makes this model a stub rather than a system. See the `gate` line: the omission is Mobus's own and is stated in the text. Also omitted: the gross anatomy of Fig. 7.11 (cortical layers over the limbic/primitive brain), the Brodmann-area mapping, and the cortical column, which Fig. 7.13 places below the level shown here and which would carry the neuron entry's whole tree beneath it again.
# gate: core (the afferent path has no exit, so the last cortical stage is a dead end at Operational — and the gap is Mobus's, stated in §7.4.4: "What is shown is not following the suggestion in Chap. 6 to start with the outputs (i.e., motor control and glandular control), though that rule of thumb still would apply. For illustration purposes, however, it is easier to show the internal message flow mapping from a sensor (in the retina), through a relay nucleus (thalamus), to the primary vision processing cortex in the occipital lobe." The corpus does not invent the missing motor path to close the graph)
# note: The three components and their order are that sentence and no more — sensor, relay nucleus, primary vision cortex. The fourth, the association cortex, is licensed separately by §7.4.5: "Columns in the initial association cortices receive inputs from the sensory columns that are activated by the presence of those features during perception and encode percepts based on correlated features, for example, roundness and redness are associated in the perception of something that will eventually be conceived as an 'apple'."
# note: The retina is OUTSIDE the boundary by footnote 8, which also flags that this placement is a decision and may be the wrong one: "Under some circumstances, it would be prudent to use the reverse analysis methods of Sect. 6.7.4 Reverse Deconstruction…, for example, when analyzing the visual system and discovering that 'eyes' are actually more complex sensory organs than simple light detectors."
# note: The thalamic relay carries `interface` because it is the only component a boundary-crossing flow touches. Mobus does not name it an interface; the flow does.
# note: Everything flowing is a message. "The brain is an information processing system — a biological computation engine" (§7.4.2). No energy or material flow is authored, though a real brain analysis would need both.
# set: Complex → CAS → CAES

system "The Mammalian Brain" : Concrete/Biological
domain "Brain science"

component "Thalamic Relay Nucleus" interface
component "Primary Visual Cortex"
component "Association Cortex"

source "Retinal Sensor"

flow "Retinal Sensor" -> "Thalamic Relay Nucleus" : informational "signals from a sensor in the retina"
flow "Thalamic Relay Nucleus" -> "Primary Visual Cortex" : informational "relayed visual signals"
flow "Primary Visual Cortex" -> "Association Cortex" : informational "features encoded by the sensory columns — roundness, redness"

@lens mobus
