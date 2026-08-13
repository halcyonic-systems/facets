# Ribosome — the translation apparatus, with the tRNA cycle closed.
# Variant C of three. Same grain as A; the BOUNDARY is wider. The synthetase
# that recharges spent tRNA is brought inside, so tRNA stops being an input
# and becomes a carrier that circulates. That single move is what turns this
# model from a chain into a loop, and a loop is what has to pass gate 3.

system "Translation Apparatus" : Concrete/Biological
domain "molecular biology: mRNA translation with the tRNA charging cycle closed"

component "Decoding Site" primitive Sensing interface
component "Peptidyl Transferase Center" primitive Combining
component Translocase primitive Propelling interface
component "Exit Tunnel" primitive Buffering interface

# Inside the boundary now: it recharges the tRNA the ribosome hands back.
component "Aminoacyl-tRNA Synthetase" primitive Combining interface

# The regulated variable of the cycle. The pool is what remembers how many
# charged tRNAs exist between one elongation step and the next, which is the
# thing a loop needs in order to be well-posed rather than instantaneous.
component "tRNA Pool" primitive Buffering

source Nucleus
sink Chaperone

environment Cytosol

flow Nucleus -> "Decoding Site" : matter "mRNA transcript"

# The cycle: charged tRNA is spent at the decoding site, the spent carrier
# reaches the synthetase, and the synthetase returns it to the pool charged.
# The return leg is MATTER, which is what lets the pool be read as a level.
flow "tRNA Pool" -> "Decoding Site" : matter "charged tRNA"
flow "Decoding Site" -> "Aminoacyl-tRNA Synthetase" : matter "deacylated tRNA"
flow "Aminoacyl-tRNA Synthetase" -> "tRNA Pool" : matter "recharged tRNA"

# What the synthetase consumes to do that, from outside.
flow Cytosol -> "Aminoacyl-tRNA Synthetase" : matter "free amino acid"
flow Cytosol -> "Aminoacyl-tRNA Synthetase" : energy "ATP"

flow Cytosol -> Translocase : energy "GTP"

flow "Decoding Site" -> "Peptidyl Transferase Center" : matter "accommodated amino acid"
flow "Peptidyl Transferase Center" -> Translocase : matter "elongated chain"
flow Translocase -> "Exit Tunnel" : matter "polypeptide chain"

flow "Exit Tunnel" -> Chaperone : matter "nascent polypeptide"
flow Translocase -> Cytosol : matter "GDP and inorganic phosphate"

@lens mobus
