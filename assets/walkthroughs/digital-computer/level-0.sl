# ── A digital computing system — level 0, the machine (Figs. 7.2 and 7.3) ───
#
# Mobus opens ch. 7 on the simplest rung of his ladder — a merely complex
# machine — and works it depth-first: boundary and environment (Fig. 7.2),
# the hardware/firmware/software triple inside (Fig. 7.3), then the hardware
# opened into CPU, RAM and I/O control (Fig. 7.4), then the CPU itself
# (Fig. 7.5), and on down a decomposition tree that ends at the transistor
# (Fig. 7.6). The corpus entry (corpus/mobus/digital-computing-system.sl)
# stops at Fig. 7.3, which is where the section's first pass stops. This
# walkthrough is the next step of the same procedure, wired for the
# decomposition walk: this file is Fig. 7.3's transparent box, and its
# Hardware component opens onto Fig. 7.4's interior.
#
# Editorial, not corpus. Two departures from the corpus entry, both of them
# the seam's doing and both grounded in the figures:
#
#   1. Hardware carries `interface` AND `decomposes`. Legal since SSF #43
#      extended the boundary contract to membrane crossings — the child's
#      boundary must REFINE each crossing (same counterparty, same substance
#      kind, landing on a named child interface) — which is what lets a
#      boundary-carrying component be a walkable box. Hardware is the right
#      one to open: every flow that crosses this model's membrane terminates
#      on it, exactly as the corpus entry's own note says.
#
#   2. The firmware coupling is drawn BOTH ways here; the corpus entry draws
#      only software → firmware → hardware, because that is the direction
#      §7.2.3.1 describes in prose. Figs. 7.3 and 7.4 draw the pair, using
#      the same dashed-arc grouping Mobus uses for the external terminal and
#      memory devices — two crossings, one entity. Drawing the return here is
#      the level-0 half of the seam: what crosses the box at this level is
#      exactly what crosses the child's membrane at the next, the same move
#      the steel walk makes with its purchase-order traffic.
#
# Everything else is Fig. 7.3's, unchanged from the transcription.

system "A Digital Computing System — inside the machine" : Concrete/Technical

domain "Digital computing"

level Structure

# Fig. 7.2's environment. The file device and the users each send AND
# receive, so each is one `environment` thing rather than a source/sink
# pair: "The computer will read programs/data from the files and write new
# programs/data back to the files."
source "Power Source"
sink "Ambient Air"
environment "External File Device"
environment "Users"

# Fig. 7.3's three. Hardware is the interface component — the interfaces are
# cable attachments (§7.2.3) and every boundary crossing lands on the
# hardware behind them — and it is the walk's door: its child is Fig. 7.4.
component Hardware interface decomposes "Hardware" @Vf4yUhPg55VodT1f4n666S
component Firmware
component Software

# The two flow kinds are Mobus's own: "That which flows within the computer
# is messages and energy" (§7.2.3.2). There are no material flows, and he
# says so.
flow "Power Source" -> Hardware : energy "line current from the A/C wall socket"
flow Hardware -> "Ambient Air" : energy "heat of computation, radiated or convected away"
flow "External File Device" -> Hardware : informational "programs and data read from files"
flow Hardware -> "External File Device" : informational "programs and data written back to files"
flow Users -> Hardware : informational "work of programmers and of end users"
flow Hardware -> Users : informational "results returned to the user"

# The software/firmware/hardware stack. The operating system "has primary
# responsibility for interfacing all other programs with the hardware
# through the firmware component"; the return leg is the second departure
# noted in the header.
flow Software -> Firmware : informational "operating-system calls on the hardware control programs"
flow Firmware -> Hardware : informational "hardware control"
flow Hardware -> Firmware : informational "results of hardware operations, returned through the firmware coupling"

@lens mobus
