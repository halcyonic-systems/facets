# ── An enzyme and its substrate: the rate that stops rising ─────────────────
# bench · after Michaelis & Menten 1913 (enzyme saturation)
#
# A flow reactor. Substrate arrives from a finite pool of 120 uM; the enzyme
# supplies a turnover capacity of 4 uM a minute; the active site is a
# Combining process that starves on its scarcest input, so it makes product at
# whichever of the two is smaller. At 6 uM/min of substrate the site is
# saturated: it makes 4 and the other 2 wash past, unconverted (the ledger
# books them as dissipated). Feed it 1, 2 or 4 and the rate follows; feed it
# 8 or 16 and it stays at 4; double the enzyme to 8 with 8 of substrate and
# the rate follows the enzyme. The saturation is a hard knee, a min, not the
# smooth Michaelis-Menten curve; the lesson is the plateau and who sets it.
#
# Split form: the inlet, the enzyme dosing and the draw-off are the pass-ways;
# the active site and the product stock are residents. The numbers are round
# so the ledger reads by eye; nothing here is a claim about any enzyme.
system "Enzyme Kinetics" : Concrete/Biological

domain "an enzyme converting a substrate into a product, up to its capacity"

time unit minute

level Structure

interface Inlet
    description "Where substrate comes in: the reactor's feed port."
interface Dosing
    description "Where the enzyme's capacity comes in: the catalyst dose."
interface Draw
    description "Where product goes out: the draw-off to the flask."

component Site primitive Combining limiting
    description "The active site: makes product at the scarcer of substrate and turnover capacity."
component Product primitive Buffering stock uM time constant 10
    description "Product in the reactor; drawn off at its level over 10 minutes."

source Substrate reservoir 120
source Enzyme
sink Flask

flow Substrate -> Inlet : matter "substrate" substance substrate amount 6 unit "uM/min"
flow Inlet -> Site : matter "binding" substance substrate
flow Enzyme -> Dosing : energy "turnover" substance catalysis amount 4 unit "uM/min"
flow Dosing -> Site : energy "turnover" substance catalysis
flow Site -> Product : matter "product" substance substrate
flow Product -> Draw : matter "drawn off" substance substrate
flow Draw -> Flask : matter "drawn off" substance substrate

param "substrate supply" : flow Substrate -> Inlet "substrate" range 0..16
param "enzyme" : flow Enzyme -> Dosing "turnover" range 0..16

metric "product collected" : sum into Flask

@lens mobus
