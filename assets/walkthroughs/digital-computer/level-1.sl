# ── Hardware, level 1 — inside the hardware (Fig. 7.4) ──────────────────────
#
# The child of level-0's Hardware component. Mobus: "We now pursue a
# depth-first decomposition of the hardware. The main results are shown in
# Fig. 7.4" — whose caption reads "Decomposition of the hardware component
# from level 1 reveals the main component subsystems of hardware and the
# flow paths of energy and data/messages."
#
# The environment lines are the seam's other half: stand-ins carrying, name
# for name, the level-0 neighbours of the decomposed component, which is
# what the boundary contract's derived-environment row checks. Mobus labels
# two of them differently in Fig. 7.4 than in Fig. 7.2 — the power source
# appears as "Voltage Regulator", and the file and user devices are split
# into their in and out arrows — so the names here are the level-0 names,
# and the figure's labels are noted where they differ.
#
# Editorial, not corpus, and the header says exactly how far the figure was
# read. Legible and transcribed:
#
#   - the three labelled interior components: CPU, RAM Memory, I/O Control;
#   - the interface capsules on the hardware membrane, one per crossing;
#   - power (red) entering at one capsule and reaching all three components;
#   - heat (red) leaving at the top of the membrane;
#   - file and user data (blue and orange) entering and leaving through I/O
#     Control, which is the only component either colour touches;
#   - data both ways between CPU and RAM Memory, and from I/O Control up
#     into both;
#   - the firmware traffic crossing at two capsules at the top.
#
# NOT read, and therefore not drawn: the capsules carry no labels in the
# figure, so the seven interface NAMES below are ours (Mobus locates the
# interfaces in "specific cable attachments" — §7.2.3 — and names none of
# them individually); and no work-process primitive is declared, because
# Mobus applies the Combining/Splitting/Buffering taxonomy to none of the
# ch. 7 examples and assigning one would be our reading of his machine.
#
# Shipped as the walk's second rung, its JSON archive pinned to this text by
# tests/digital_computer_walkthrough.rs.

system "Hardware" : Concrete/Technical

domain "Digital computing"

level Structure

# E′ — the interior and environmental neighbourhood of the level-0 Hardware
# component, one stand-in per neighbour, names carried exactly. "Power
# Source" is Fig. 7.4's "Voltage Regulator"; "External File Device" is its
# File Input Data / File Output Data pair; "Users" is its User Input Data /
# User Output Data pair.
source "Power Source"
sink "Ambient Air"
environment "External File Device"
environment "Users"
environment "Firmware"

# The membrane capsules of Fig. 7.4, one per crossing. Each is `interface`
# because it gates a flow across this model's boundary; the names are ours,
# per the header.
component Power-Connector interface
component Heat-Dissipation interface
component File-Port-In interface
component File-Port-Out interface
component User-Port-In interface
component User-Port-Out interface
component Firmware-Port-In interface
component Firmware-Port-Out interface

# Fig. 7.4's three labelled subsystems. The CPU is the one Mobus opens next,
# at Fig. 7.5 ("we select the CPU as the next module to be analyzed"); this
# walk stops above that, so the CPU stays closed here exactly as
# Coke-Inventory stays closed in the steel walk.
component CPU
component "RAM Memory"
component "I/O Control"

# Energy in, and out as heat. "All work performed in the various components
# is simply managing energy flows (switching of transistors) and results in
# heat. No energy is actually stored except in capacitors for very brief
# periods" (§7.2.3.1) — which is why all three components vent and none
# accumulates.
flow "Power Source" -> Power-Connector : energy "line current from the A/C wall socket"
flow Power-Connector -> CPU : energy "regulated supply"
flow Power-Connector -> "RAM Memory" : energy "regulated supply"
flow Power-Connector -> "I/O Control" : energy "regulated supply"
flow CPU -> Heat-Dissipation : energy "switching heat"
flow "RAM Memory" -> Heat-Dissipation : energy "switching heat"
flow "I/O Control" -> Heat-Dissipation : energy "switching heat"
flow Heat-Dissipation -> "Ambient Air" : energy "heat of computation, radiated or convected away"

# Data in and out. Every external data path in the figure lands on I/O
# Control, in both colours and both directions — which is the component's
# name doing its work.
flow "External File Device" -> File-Port-In : informational "programs and data read from files"
flow File-Port-In -> "I/O Control" : informational "file data on the way in"
flow "I/O Control" -> File-Port-Out : informational "file data on the way out"
flow File-Port-Out -> "External File Device" : informational "programs and data written back to files"
flow Users -> User-Port-In : informational "work of programmers and of end users"
flow User-Port-In -> "I/O Control" : informational "user input on the way in"
flow "I/O Control" -> User-Port-Out : informational "results on the way out"
flow User-Port-Out -> Users : informational "results returned to the user"

# The internal busses. "Messages are coded in binary streams and are
# synchronous… the flow of data from these components to one another is
# handled via the internal busses (there may be several)" (§7.2.3.1).
flow "I/O Control" -> CPU : informational "data delivered to the processor"
flow "I/O Control" -> "RAM Memory" : informational "data written straight to memory"
flow CPU -> "RAM Memory" : informational "stores over the internal bus"
flow "RAM Memory" -> CPU : informational "loads over the internal bus"
flow "RAM Memory" -> "I/O Control" : informational "data staged for output"

# The firmware coupling, crossing at the two capsules Fig. 7.4 draws at the
# top of the membrane. Level 0 asserts one crossing each way; this is where
# they land.
flow Firmware -> Firmware-Port-In : informational "hardware control"
flow Firmware-Port-In -> CPU : informational "control programs fetched from ROM"
flow CPU -> Firmware-Port-Out : informational "operation results on the way back"
flow Firmware-Port-Out -> Firmware : informational "results of hardware operations, returned through the firmware coupling"

@lens mobus
