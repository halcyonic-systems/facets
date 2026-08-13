# Ribosome — the elongation cycle, read as functional centers.
# Variant A of three. Boundary: the ribosome itself. Charging of tRNA and
# regeneration of GTP happen outside it, so both arrive as inputs.

system "Ribosome" : Concrete/Biological
domain "molecular biology: mRNA translation into a polypeptide chain"

# The small subunit's business: hold the message and check each pairing.
component "Decoding Site" primitive Sensing interface

# The large subunit's business. The peptidyl transferase center is rRNA —
# the bond is catalysed by the ribosome's own structure, not by a protein.
component "Peptidyl Transferase Center" primitive Combining interface

# EF-G hydrolyses GTP to ratchet the ribosome one codon along the message.
component Translocase primitive Propelling interface

# The nascent chain accumulates here before it leaves; it is the one place
# in the model that holds a growing quantity.
component "Exit Tunnel" primitive Buffering interface

source Nucleus
source "tRNA Synthetase Pool"
sink Chaperone

# The cytosol both supplies and receives: GTP comes out of it, spent GDP and
# deacylated tRNA go back into it. Neither pure source nor pure sink.
environment Cytosol

flow Nucleus -> "Decoding Site" : matter "mRNA transcript"
flow "tRNA Synthetase Pool" -> "Decoding Site" : matter "charged tRNA"
flow Cytosol -> Translocase : energy "GTP"
flow Cytosol -> "Peptidyl Transferase Center" : energy "GTP"

flow "Decoding Site" -> "Peptidyl Transferase Center" : matter "accommodated amino acid"
flow "Peptidyl Transferase Center" -> Translocase : matter "elongated chain"
flow Translocase -> "Exit Tunnel" : matter "polypeptide chain"

flow "Exit Tunnel" -> Chaperone : matter "nascent polypeptide"
flow "Decoding Site" -> Cytosol : matter "deacylated tRNA"
flow Translocase -> Cytosol : matter "GDP and inorganic phosphate"

@lens mobus
