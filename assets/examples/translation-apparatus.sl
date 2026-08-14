# Ribosome — the translation apparatus, with the tRNA cycle closed.
# Variant C of three. Same grain as A; the BOUNDARY is wider. The synthetase
# that recharges spent tRNA is brought inside, so tRNA stops being an input
# and becomes a carrier that circulates. That single move is what turns this
# model from a chain into a loop, and a loop is what has to pass gate 3.

system "Translation Apparatus" : Concrete/Biological
domain "molecular biology: mRNA translation with the tRNA charging cycle closed"
time unit second

component "Decoding Site" primitive Sensing interface
component "Peptidyl Transferase Center" primitive Combining interface
component Translocase primitive Propelling interface
component "Exit Tunnel" primitive Buffering interface

# Inside the boundary now: it recharges the tRNA the ribosome hands back.
component "Aminoacyl-tRNA Synthetase" primitive Combining interface

# The regulated variable of the cycle. The pool is what remembers how many
# charged tRNAs exist between one elongation step and the next, which is the
# thing a loop needs in order to be well-posed rather than instantaneous.
# It starts full and drains at the elongation rate — the two facts SL could
# not say until #112 slice 1 (the archived reservoir and homeostat carry the
# history of that refusal). 20/s matches usage; the pool holds steady only
# once #340 stops ATP's energy inflating the recharge.
component "tRNA Pool" primitive Buffering stock tRNA initial 100 release 20

source Nucleus
sink Chaperone

environment Cytosol

# Rates are steady-state elongation at 20 residues/s (Wikipedia, Translation:
# 17-21 aa/s prokaryotic; quantities sheet 2026-08-14). Energy enters as GTP at
# translocation and ATP at charging; 2 GTP + 2 ATP-bonds per residue checks
# against the article's 4n-1 total. Initiation, termination and proofreading
# are below this grain.
flow Nucleus -> "Decoding Site" : matter "mRNA transcript" amount 20 unit codon/s

# The cycle: charged tRNA is spent at the decoding site, the spent carrier
# reaches the synthetase, and the synthetase returns it to the pool charged.
# The return leg is MATTER, which is what lets the pool be read as a level.
flow "tRNA Pool" -> "Decoding Site" : matter "charged tRNA"
flow "Decoding Site" -> "Aminoacyl-tRNA Synthetase" : matter "deacylated tRNA"
flow "Aminoacyl-tRNA Synthetase" -> "tRNA Pool" : matter "recharged tRNA"

# What the synthetase consumes to do that, from outside.
flow Cytosol -> "Aminoacyl-tRNA Synthetase" : matter "free amino acid" amount 20 unit aa/s
flow Cytosol -> "Aminoacyl-tRNA Synthetase" : energy "ATP" amount 20 unit ATP/s

flow Cytosol -> Translocase : energy "GTP" amount 40 unit GTP/s

flow "Decoding Site" -> "Peptidyl Transferase Center" : matter "accommodated amino acid"
flow "Peptidyl Transferase Center" -> Translocase : matter "elongated chain"
flow Translocase -> "Exit Tunnel" : matter "polypeptide chain"

# George's third correction (2026-08-12 call): the ionic milieu genuinely
# interacts with the large subunit. At this grain the large subunit's catalytic
# center is the PTC, so the milieu enters there. Magnitude is not the point of
# this edge, so it stays unauthored; `ample` cannot say it (informational only).
flow Cytosol -> "Peptidyl Transferase Center" : matter "Mg2+ and ionic milieu"

flow "Exit Tunnel" -> Chaperone : matter "nascent polypeptide"
flow Translocase -> Cytosol : matter "GDP and inorganic phosphate"

@lens mobus
