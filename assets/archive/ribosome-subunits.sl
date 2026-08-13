# Ribosome — the two subunits, read as the parts that do the work.
# Variant B of three. Same boundary as A, coarser grain: the components are
# the physical subunits rather than the functional centers inside them.
# This is the shape George's own correction presupposes — he asked for the
# magnesium and ionic milieu to be an input to the LARGE SUBUNIT, which is
# a component only in a model drawn at this grain.

system "Ribosome" : Concrete/Biological
domain "molecular biology: mRNA translation into a polypeptide chain"

# Holds the message and checks each codon-anticodon pairing.
component "Small Subunit" primitive Sensing interface

# Carries the peptidyl transferase center and the exit tunnel. The catalysis
# is rRNA's, which is why the ionic milieu that folds it is load-bearing
# rather than incidental.
component "Large Subunit" primitive Combining interface

source Nucleus
source "tRNA Synthetase Pool"
sink Chaperone

environment Cytosol

flow Nucleus -> "Small Subunit" : matter "mRNA transcript"
flow "tRNA Synthetase Pool" -> "Small Subunit" : matter "charged tRNA"

# George's correction, 2026-08-12: an input to the large subunit.
flow Cytosol -> "Large Subunit" : matter "Mg2+ and ionic milieu"
flow Cytosol -> "Large Subunit" : energy "GTP"

flow "Small Subunit" -> "Large Subunit" : matter "accommodated aminoacyl-tRNA"

flow "Large Subunit" -> Chaperone : matter "nascent polypeptide"
flow "Small Subunit" -> Cytosol : matter "deacylated tRNA"
flow "Large Subunit" -> Cytosol : matter "GDP and inorganic phosphate"

@lens mobus
