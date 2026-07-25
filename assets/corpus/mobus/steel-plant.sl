# corpus-entry: v1
# title: The Steel-Plant in its environment
# author: George Mobus
# work: Systems Science: Theory, Analysis, Modeling, and Design
# year: 2022
# locus: Ch. 4 §4.5
# figure: Fig. 4.14 and Listing 4.1
# teaches: Mobus's own worked exemplar for SL, at the level the figure draws it: the SOI Steel-Plant as an opaque box situated among three environmental sources and three sinks, with electric energy, iron and coke crossing in and steel, scrap and waste heat crossing out. Six flows, six environment entities, one boundary — the whole of level -1, and nothing beneath it.
# omits: Everything the chapter reveals after Fig. 4.14. Fig. 4.15's separate boundary interfaces, Fig. 4.16's internal components and the Materials-Purchasing message interface with its bidirectional supplier, and Fig. 4.17's Iron-Inventory decomposition down to Iron-stock are all later figures, and none of them is drawn here. Also omitted: the sysXML source_model / sink_model delivery schedules of Listing 4.1, which are dynamics, not structure.
# note: Listing 4.1 declares the SOI itself as `type=PROCESS`, so the opaque box is a work process. SL puts the SOI's name on the model and its things one level in, so S0 appears here twice over: as the model's name, and as the single Combining component that carries every flow. That doubling is our construction, not Mobus's drawing — Fig. 4.14 has one box.
# note: Mobus's identification codes have no SL counterpart (ids are the compiler's, not the author's), so each is carried in the flow's name: Src-1.0/1.1/1.2 and Snk-1.0/1.1/1.2 by their own names, F-1.0 through F-1.5 in the flow labels. The environment is level -1 in his notation; SL has no level word, and the source/sink lines are the whole of it.
# note: Listing 4.1 gives outflow_id="F-1.4" for BOTH Garbage-Sink and the atmosphere sink. Read as a typo in the listing — the two are distinct outflows in Fig. 4.14 — and the waste-heat flow is numbered F-1.5 here. Flagged rather than silently reproduced.
# note: The SOI is declared `subtype=MATTER subtype=ENERGY subtype=MESSAGE`, but no message crosses the boundary at this level. The message flow arrives only with Materials-Purchasing in Fig. 4.16, so the MESSAGE subtype is an announcement the level-1 model does not yet cash.
# note: The sink named ATMOSPHERE is unquoted and all-caps in the listing where every other name is quoted and hyphenated. Kept verbatim rather than normalized to Atmosphere.

system "Steel-Plant" : Concrete/Technical

domain "Steel manufacturing"

# S0 as Fig. 4.14 draws it: one opaque box. Combining, because the plant's
# transformation takes iron, coke and electric energy together and yields steel
# — Mobus's own reading of the SOI as a PROCESS. `interface` because every flow
# in this model crosses the boundary; which interface gates which flow is the
# analysis of Fig. 4.15, one figure later.
component "Steel-Plant" primitive Combining interface

# The environment, level -1. Three vendors on the input side.
source Energy-Source
source Iron-Source
source Coke-Source

# Three sinks: the customer who buys the steel, disposal for the scrap, and the
# atmosphere the plant radiates into. Only the first is a product; the other two
# are what the plant must get rid of to keep running.
sink Steel-Sink
sink Garbage-Sink
sink ATMOSPHERE

# Inputs. Electricity is energy; iron and coke are matter — the distinction is
# the SOI's own `type=ENERGY` / `type=MATERIAL` attributes in Listing 4.1.
flow Energy-Source -> "Steel-Plant" : energy "F-1.0 — electric energy"
flow Iron-Source -> "Steel-Plant" : matter "F-1.1 — iron-input"
flow Coke-Source -> "Steel-Plant" : matter "F-1.2 — coke-input"

# Outputs. One product and two wastes, and the waste heat is energy where the
# scrap is matter — the plant exports both kinds across the same boundary.
flow "Steel-Plant" -> Steel-Sink : matter "F-1.3 — steel for sale"
flow "Steel-Plant" -> Garbage-Sink : matter "F-1.4 — scrap and wastage"
flow "Steel-Plant" -> ATMOSPHERE : energy "F-1.5 — radiated waste heat"

@lens mobus
