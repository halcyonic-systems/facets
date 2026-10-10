# Ribosome — the elongation cycle, read as functional centers.
# Variant A of three. Boundary: the ribosome itself. Charging of tRNA and
# regeneration of GTP happen outside it, so both arrive as inputs.
#
# Ribosome and Translation Apparatus are ONE SYSTEM AT TWO BOUNDARY CHOICES,
# not two systems: this file is the machine at the level of its centers,
# and Translation Apparatus is the same machine with the tRNA cycle closed.
# All four components here reappear there by name. The pair is the shelf's
# lesson in boundary choice, so both blurbs say so.

system "Ribosome" : Concrete/Biological
domain "molecular biology: mRNA translation into a polypeptide chain — the same machine the Translation Apparatus model draws, at the level of its centers, with the tRNA charging cycle left outside the boundary"

# The small subunit's business: hold the message and check each pairing.
component "Decoding Site" primitive Sensing
    description "The small subunit's decoding center: reads each codon of the message and checks it against the anticodon of the incoming charged tRNA."

# The large subunit's business. The peptidyl transferase center is rRNA —
# the bond is catalysed by the ribosome's own structure, not by a protein.
component "Peptidyl Transferase Center" primitive Combining
    description "The large subunit's catalytic center, made of rRNA: joins the newly accommodated amino acid to the growing chain with a peptide bond."

# EF-G hydrolyses GTP to ratchet the ribosome one codon along the message.
component Translocase primitive Propelling
    description "The translocation step: the factor EF-G spends GTP to move the ribosome one codon along the message."

# The nascent chain accumulates here before it leaves; it is the one place
# in the model that holds a growing quantity.
component "Exit Tunnel" primitive Buffering
    description "The channel through the large subunit that holds the growing chain until it leaves."

# The pass-ways for the four resident centers above: where the message and
# the tRNAs meet the decoding site, where GTP reaches the peptidyl
# transferase center, where the factor docks on the translocase, and where
# the chain leaves the exit tunnel.
interface "mRNA Entry Channel"
    description "The channel on the small subunit through which the message is threaded into the decoding site."
interface "A Site"
    description "The aminoacyl site, where each charged tRNA enters the decoding site to be matched against its codon."
interface "E Site"
    description "The exit site, where spent tRNA leaves the decoding site after its amino acid is transferred."
interface "EF-G Docking Site"
    description "Where EF-G docks on the large subunit to deliver GTP to the translocase and release the products of its hydrolysis."
interface "Factor-Binding Site"
    description "Where the GTP-bound factor docks on the large subunit and passes its GTP inward."
interface "Tunnel Exit"
    description "The opening at the end of the exit tunnel where the emerging chain leaves the ribosome."

source Nucleus
    description "Where the message comes from: supplies the mRNA transcript and is opaque beyond that."
source "tRNA Synthetase Pool"
    description "The enzymes outside the boundary that attach amino acids to tRNA; supply charged tRNA."
sink Chaperone
    description "The chaperone that receives the emerging chain and helps it fold."

# The cytosol both supplies and receives: GTP comes out of it, spent GDP and
# deacylated tRNA go back into it. Neither pure source nor pure sink.
environment Cytosol
    description "The surrounding cytosol: supplies GTP and takes back spent tRNA and the products of GTP hydrolysis."

flow Nucleus -> "mRNA Entry Channel" : matter "mRNA transcript" substance mrna
    description "The message to be read, arriving at the entry channel."
flow "mRNA Entry Channel" -> "Decoding Site" : matter "mRNA transcript" substance mrna
    description "The message threaded from the channel into the decoding site."
flow "tRNA Synthetase Pool" -> "A Site" : matter "charged tRNA" substance trna
    description "Transfer RNAs already loaded with their amino acids, arriving at the A site."
flow "A Site" -> "Decoding Site" : matter "charged tRNA" substance trna
    description "Each charged tRNA passed from the A site to be matched against its codon."
flow Cytosol -> "EF-G Docking Site" : energy "GTP" substance gtp
    description "GTP arriving with EF-G at the docking site."
flow "EF-G Docking Site" -> Translocase : energy "GTP" substance gtp
    description "GTP passed inward to power each step along the message."
flow Cytosol -> "Factor-Binding Site" : energy "GTP" substance gtp
    description "GTP arriving at the factor-binding site from the cytosol."
flow "Factor-Binding Site" -> "Peptidyl Transferase Center" : energy "GTP" substance gtp
    description "GTP passed inward from the factor-binding site to the peptidyl transferase center."

flow "Decoding Site" -> "Peptidyl Transferase Center" : matter "accommodated amino acid" substance aminoacid
    description "The amino acid carried by the matched tRNA, seated in the peptidyl transferase center ready to be joined to the chain."
flow "Peptidyl Transferase Center" -> Translocase : matter "elongated chain" substance peptide
    description "The chain, one residue longer after the new peptide bond, handed on for the next step."
flow Translocase -> "Exit Tunnel" : matter "polypeptide chain" substance peptide
    description "The growing chain moving into the exit tunnel."

flow "Exit Tunnel" -> "Tunnel Exit" : matter "nascent polypeptide" substance peptide
    description "The nascent chain reaching the end of the tunnel."
flow "Tunnel Exit" -> Chaperone : matter "nascent polypeptide" substance peptide
    description "The nascent chain leaving the ribosome and meeting the chaperone."
flow "Decoding Site" -> "E Site" : matter "deacylated tRNA" substance trna
    description "Spent tRNA, stripped of its amino acid, moving to the exit site."
flow "E Site" -> Cytosol : matter "deacylated tRNA" substance trna
    description "Spent tRNA released from the exit site back to the cytosol."
flow Translocase -> "EF-G Docking Site" : matter "GDP and inorganic phosphate" substance gdp
    description "What is left of the GTP after hydrolysis, handed back to the docking site."
flow "EF-G Docking Site" -> Cytosol : matter "GDP and inorganic phosphate" substance gdp
    description "The hydrolysis products released from the docking site into the cytosol."

@lens mobus
