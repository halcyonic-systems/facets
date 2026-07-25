# corpus-entry: v1
# title: A digital computing system
# author: George Mobus
# work: Systems Science: Theory, Analysis, Modeling, and Design
# year: 2022
# locus: Ch. 7 §7.2.3–§7.2.3.1
# figure: Figs. 7.2 and 7.3
# teaches: The first rung of the chapter's ladder — a MERELY COMPLEX system, analysed only as far as level 1. What the reader should notice is how little the first pass contains and how much it already fixes: the boundary, the four environmental entities Mobus names (wall socket, file device, users, heat), the direction of every crossing flow, and the three internal components (hardware, software, and the firmware that couples them). Nothing here adapts or evolves; that is the point of starting here.
# omits: Everything below level 1. Mobus continues depth-first into the hardware (Fig. 7.4), then the CPU as a level-2 SOI with the other subsystems demoted to sources and sinks (Fig. 7.5), then ALU → registers → D-latches → transistors as the atomic component (Fig. 7.6). None of that is authored: this entry is the environment-and-boundary pass only. Also omitted is the operating system inside the software component, which Mobus names and then sets aside ("The details of how this works will not concern us").
# note: The interfaces are Mobus's, and their PLACEMENT is our simplification. He locates them in the cable attachments — "All of the shown interfaces are handled through specific cable attachments that, essentially, keep the wires straight" (§7.2.3), and Fig. 7.3's caption reads "The interfaces with the outside world are through cable connectors". A fuller model would give each attachment as its own interface component. Here the hardware carries the `interface` flag, because it is the component every boundary-crossing flow actually terminates on.
# note: The file device and the users each SEND and RECEIVE, so each is one `environment` thing rather than a source/sink pair: "The computer will read programs/data from the files and write new programs/data back to the files (or create new files as needed)." Mobus's own systemese would split these into Src and Snk sets; the single entity is closer to what Fig. 7.2 draws.
# note: Only the downward internal coupling is authored. Mobus describes the software→hardware direction — the operating system "has primary responsibility for interfacing all other programs with the hardware through the firmware component" — and does not describe a return path at this level, so none is drawn.
# note: No work-process primitive is declared anywhere in this entry, or in any ch. 7 entry. The Combining/Splitting/Buffering taxonomy is Mobus's, but he does not apply it to these example systems; assigning one would be our reading, not his.
# note: The two flow kinds are his: "That which flows within the computer is messages and energy" (§7.2.3.2). There are no material flows, and he says so.
# set: Complex → CAS → CAES

system "A Digital Computing System" : Concrete/Technical
domain "digital computing"

component Hardware interface
component Firmware
component Software

source "Power Source"
sink "Ambient Air"
environment "External File Device"
environment "Users"

flow "Power Source" -> Hardware : energy "line current from the A/C wall socket"
flow Hardware -> "Ambient Air" : energy "heat of computation, radiated or convected away"
flow "External File Device" -> Hardware : informational "programs and data read from files"
flow Hardware -> "External File Device" : informational "programs and data written back to files"
flow Users -> Hardware : informational "work of programmers and of end users"
flow Hardware -> Users : informational "results returned to the user"
flow Software -> Firmware : informational "operating-system calls on the hardware control programs"
flow Firmware -> Hardware : informational "hardware control"

@lens mobus
