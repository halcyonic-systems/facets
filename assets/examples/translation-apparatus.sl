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

# Both naming panels' verdict: the exit tunnel IS a pass-way, not a processor
# — an 80-100 Å conduit through the large subunit whose exit port (the
# L23/L29 ring) is where the chaperone docks (Ferbitz et al. 2004). George's
# first correction keeps its name, now in its structurally honest place.
interface "Exit Tunnel" protocol "nascent polypeptide, N-terminus first" description "The polypeptide exit tunnel through the large subunit, opening at the exit port where trigger-factor-class chaperones dock to receive the emerging chain."

# ── The processors, inside ────────────────────────────────────────────────
component "Decoding Site" primitive Sensing description "The decoding center on the small subunit, where each codon is read against the anticodon of an incoming charged tRNA — selection of the right carrier, not catalysis."
component "Peptidyl Transferase Center" primitive Combining description "The catalytic heart of the large subunit, all rRNA: forges each peptide bond between the growing chain and the newly accommodated amino acid."
component Translocase primitive Propelling description "The ratcheting step: GTP-powered translocation advances mRNA and tRNAs by exactly one codon, moving the whole machine forward."
component "Aminoacyl-tRNA Synthetase" primitive Combining description "The recharging enzyme: matches each spent tRNA with its cognate amino acid and charges it at ATP's expense — the move that closes the carrier cycle."

# The regulated variable of the cycle. The pool is what remembers how many
# charged tRNAs exist between one elongation step and the next, which is the
# thing a loop needs in order to be well-posed rather than instantaneous.
# It starts full and drains at the elongation rate — the two facts SL could
# not say until #112 slice 1 (the archived reservoir and homeostat carry the
# history of that refusal). 20/s matches usage; the pool holds steady only
# once #340 stops ATP's energy inflating the recharge.
component "tRNA Pool" primitive Buffering stock tRNA initial 100 release 20 description "The circulating stock of charged tRNAs — the cycle's memory between one elongation step and the next. Starts full at 100 and drains at the elongation rate."

source Nucleus description "The transcript's origin: the compartment that supplies mRNA, opaque here except as the source of the coding stream."
sink Chaperone description "The trigger-factor-class chaperone docked at the exit port, receiving each nascent polypeptide as it emerges — where the model's output lands."

environment Cytosol description "The surrounding cytosol: reservoir of free amino acids, ATP and GTP, and the sink for hydrolysis products. Internally opaque — it supplies and receives."

# ── The milieu, bathing the machine ───────────────────────────────────────
# George's third correction (2026-08-12 call): the ionic milieu genuinely
# interacts with the large subunit. It is now represented by his own newest
# construct — E = ⟨O, M⟩ from the lifecycle paper's introduction: ions have
# no discrete point source and no port (structures resolve hundreds of
# ordered Mg2+ throughout the particle; Klein, Moore & Steitz 2004), so
# this is a condition that bathes, not a flow that plugs in. Free Mg2+ in
# the bacterial cytosol sits near 1 mM (Alatossava et al. 1985).
milieu "Mg2+ and ionic milieu" value 1 unit mM description "The coordination shell: Mg2+-phosphate contacts the folded rRNA, including the PTC's catalytic core, cannot hold its structure without. Diffuse by nature — no channel exists, and none is invented."

# Rates are steady-state elongation at 20 residues/s (Wikipedia, Translation:
# 17-21 aa/s prokaryotic; quantities sheet 2026-08-14). Energy enters as GTP at
# translocation and ATP at charging; 2 GTP + 2 ATP-bonds per residue checks
# against the article's 4n-1 total. Initiation, termination and proofreading
# are below this grain.
flow Nucleus -> "mRNA Entry Channel" : matter "mRNA transcript" amount 20 unit codon/s description "Steady-state transcript supply: codons arriving at the entry channel at the elongation rate."
flow "mRNA Entry Channel" -> "Decoding Site" : matter "mRNA transcript" unit codon/s description "The threaded transcript handed inward from the channel to the decoding site, reading frame intact."

# The cycle: charged tRNA is spent at the decoding site, the spent carrier
# reaches the synthetase, and the synthetase returns it to the pool charged.
# The return leg is MATTER, which is what lets the pool be read as a level.
flow "tRNA Pool" -> "Decoding Site" : matter "charged tRNA" unit tRNA/s description "Charged tRNAs leaving the pool to be read at the decoding site — the cycle's working leg."
flow "Decoding Site" -> "Aminoacyl-tRNA Synthetase" : matter "deacylated tRNA" unit tRNA/s description "The spent carrier, stripped of its amino acid, passed on for recharging."
flow "Aminoacyl-tRNA Synthetase" -> "tRNA Pool" : matter "recharged tRNA" unit tRNA/s description "Recharged tRNA returned to the pool — the leg that closes the loop."

# What the synthetase consumes to do that, from outside — both substrates
# through the one aminoacylation pocket.
flow Cytosol -> "Aminoacylation Site" : matter "free amino acid" amount 20 unit aa/s description "Free amino acids from the cytosol, co-binding at the aminoacylation pocket."
flow Cytosol -> "Aminoacylation Site" : energy "ATP" amount 20 unit ATP/s description "ATP co-bound at the same pocket — the energy that pays for charging."
flow "Aminoacylation Site" -> "Aminoacyl-tRNA Synthetase" : matter "free amino acid" unit aa/s description "The pocket's matter handoff: amino acid delivered into the synthetase."
flow "Aminoacylation Site" -> "Aminoacyl-tRNA Synthetase" : energy "ATP" unit ATP/s description "The pocket's energy handoff: ATP delivered into the synthetase."

flow Cytosol -> "GTPase-Associated Center" : energy "GTP" amount 40 unit GTP/s description "GTP-loaded elongation factors docking at the factor-binding hub."
flow "GTPase-Associated Center" -> Translocase : energy "GTP" unit GTP/s description "GTP delivered inward to power each translocation step."

flow "Decoding Site" -> "Peptidyl Transferase Center" : matter "accommodated amino acid" unit aa/s description "The selected, accommodated amino acid passed to the catalytic center."
flow "Peptidyl Transferase Center" -> Translocase : matter "elongated chain" unit aa/s description "The chain, one residue longer, handed forward for ratcheting."

flow Translocase -> "Exit Tunnel" : matter "polypeptide chain" unit aa/s description "The growing polypeptide advanced into the exit tunnel."
# Unit is the COUNT (aa), not the rate: this leg is what the Chaperone sink
# and the "polypeptide output" metric accumulate, and a running total of
# residues is measured in residues — the interior legs keep their rate form.
flow "Exit Tunnel" -> Chaperone : matter "nascent polypeptide" unit aa description "The emerging nascent chain, N-terminus first, delivered to the waiting chaperone."

flow Translocase -> "GTPase-Associated Center" : matter "GDP and inorganic phosphate" unit GDP/s description "Hydrolysis products leaving the translocase after each step."
flow "GTPase-Associated Center" -> Cytosol : matter "GDP and inorganic phosphate" unit GDP/s description "GDP and phosphate returned to the cytosol through the same docking site."

# ── Declared parameters: the environment's knobs, in the model's words ────
# Mobus ch. 4 (bert-lenses#260): environmental entities are unmodeled
# INTERNALLY, not unparameterized — "the way to alter a simulation's behavior
# is to adjust the parameters of its inputs and outputs." Ranges run 0 → 2×
# the steady-state calibration: 0 is arrest/starvation (transcriptional
# shutoff, amino-acid or energy starvation), 2× is saturated supply — the
# span a wet-lab perturbation actually sweeps.
param "mRNA supply" : flow Nucleus -> "mRNA Entry Channel" range 0..40
param "amino acid supply" : flow Cytosol -> "Aminoacylation Site" "free amino acid" range 0..40
param "ATP supply" : flow Cytosol -> "Aminoacylation Site" "ATP" range 0..40
param "GTP supply" : flow Cytosol -> "GTPase-Associated Center" range 0..80

# ── Declared metric: the reading the perturbations are FOR ────────────────
# The finished protein handed to the chaperone — the model's output in the
# model's words (#203). Sweep a supply param and this is what answers.
metric "polypeptide output" : sum into Chaperone

@lens mobus
