# Ribosome — the translation apparatus, with the tRNA cycle closed.
# Variant C of three. Same grain as A; the BOUNDARY is wider. The synthetase
# that recharges spent tRNA is brought inside, so tRNA stops being an input
# and becomes a carrier that circulates. That single move is what turns this
# model from a chain into a loop, and a loop is what has to pass gate 3.
#
# Interfaces are declared as their own pass-ways (#226): each is a real named
# structure of the translation machinery where one exists, and an honest
# descriptor where the crossing is diffusive (no invented anatomy — the two
# naming panels' convergence, 2026-08-16). The processors sit inside; a
# crossing flow enters through its pass-way and hands off interiorly.

system "Translation Apparatus" : Concrete/Biological
domain "molecular biology: mRNA translation with the tRNA charging cycle closed"
time unit second

# ── The pass-ways, on the membrane ────────────────────────────────────────
# The 30S subunit's literal mRNA channel: entry between head and shoulder,
# gripping the frame (Yusupova et al. 2001).
interface "mRNA Entry Channel" protocol "single-stranded mRNA, threaded codon by codon" description "The small subunit's mRNA channel — entry between the head and shoulder at the neck, whose grip keeps the reading frame."

# No channel exists for the synthetase's small-molecule inputs — amino acid
# and ATP co-bind at one catalytic pocket (Ibba & Söll 2000). One pass-way,
# honestly named for the pocket, carries both.
interface "Aminoacylation Site" protocol "cognate amino acid + ATP at one catalytic pocket" description "The synthetase's aminoacylation active site: amino acid and ATP co-bind at the same pocket that charges the tRNA. Diffusive access — a pocket, not a channel."

# The large subunit's factor-docking hub (sarcin-ricin loop + L7/L12 stalk):
# where GTP-loaded factors meet the machine, and where hydrolysis products
# leave (Voorhees & Ramakrishnan 2013). One site, both directions.
interface "GTPase-Associated Center" protocol "GTP-loaded elongation factors dock; GDP + Pi release" description "The factor-binding hub on the large subunit — sarcin-ricin loop and the L7/L12 stalk. GTP arrives and its hydrolysis products leave through the same real docking site."

# Ions permeate the whole particle — no port exists. The honest interface is
# the coordination shell the folded rRNA cannot hold its structure without
# (Klein, Moore & Steitz 2004).
interface "Ion Coordination Shell" protocol "Mg2+ and monovalent ions, by diffusion" description "Not a channel: the ensemble of Mg2+-phosphate coordination contacts that stabilize the folded rRNA, including the PTC's catalytic core. The milieu crossing is diffuse, and this name says so."

# Both naming panels' verdict: the exit tunnel IS a pass-way, not a processor
# — an 80-100 Å conduit through the large subunit whose exit port (the
# L23/L29 ring) is where the chaperone docks (Ferbitz et al. 2004). George's
# first correction keeps its name, now in its structurally honest place.
interface "Exit Tunnel" protocol "nascent polypeptide, N-terminus first" description "The polypeptide exit tunnel through the large subunit, opening at the exit port where trigger-factor-class chaperones dock to receive the emerging chain."

# ── The processors, inside ────────────────────────────────────────────────
component "Decoding Site" primitive Sensing
component "Peptidyl Transferase Center" primitive Combining
component Translocase primitive Propelling
component "Aminoacyl-tRNA Synthetase" primitive Combining

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
flow Nucleus -> "mRNA Entry Channel" : matter "mRNA transcript" amount 20 unit codon/s
flow "mRNA Entry Channel" -> "Decoding Site" : matter "mRNA transcript"

# The cycle: charged tRNA is spent at the decoding site, the spent carrier
# reaches the synthetase, and the synthetase returns it to the pool charged.
# The return leg is MATTER, which is what lets the pool be read as a level.
flow "tRNA Pool" -> "Decoding Site" : matter "charged tRNA"
flow "Decoding Site" -> "Aminoacyl-tRNA Synthetase" : matter "deacylated tRNA"
flow "Aminoacyl-tRNA Synthetase" -> "tRNA Pool" : matter "recharged tRNA"

# What the synthetase consumes to do that, from outside — both substrates
# through the one aminoacylation pocket.
flow Cytosol -> "Aminoacylation Site" : matter "free amino acid" amount 20 unit aa/s
flow Cytosol -> "Aminoacylation Site" : energy "ATP" amount 20 unit ATP/s
flow "Aminoacylation Site" -> "Aminoacyl-tRNA Synthetase" : matter "free amino acid"
flow "Aminoacylation Site" -> "Aminoacyl-tRNA Synthetase" : energy "ATP"

flow Cytosol -> "GTPase-Associated Center" : energy "GTP" amount 40 unit GTP/s
flow "GTPase-Associated Center" -> Translocase : energy "GTP"

flow "Decoding Site" -> "Peptidyl Transferase Center" : matter "accommodated amino acid"
flow "Peptidyl Transferase Center" -> Translocase : matter "elongated chain"

# George's third correction (2026-08-12 call): the ionic milieu genuinely
# interacts with the large subunit. At this grain the large subunit's catalytic
# center is the PTC, so the milieu enters there. Magnitude is not the point of
# this edge, so it stays unauthored; `ample` cannot say it (informational only).
flow Cytosol -> "Ion Coordination Shell" : matter "Mg2+ and ionic milieu"
flow "Ion Coordination Shell" -> "Peptidyl Transferase Center" : matter "Mg2+ and ionic milieu"

flow Translocase -> "Exit Tunnel" : matter "polypeptide chain"
flow "Exit Tunnel" -> Chaperone : matter "nascent polypeptide"

flow Translocase -> "GTPase-Associated Center" : matter "GDP and inorganic phosphate"
flow "GTPase-Associated Center" -> Cytosol : matter "GDP and inorganic phosphate"

@lens mobus
