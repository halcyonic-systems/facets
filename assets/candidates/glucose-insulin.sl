# ── Glucose and insulin: two stocks, each steering the other ────────────────
#
# Blood glucose (1 g/L at rest) is taken up by muscle in proportion to how
# much insulin there is; insulin is secreted in proportion to how much glucose
# there is and cleared over ten minutes. Each gauge reads half (a Sensing
# default), so at rest uptake 0.1 g/L/min balances the gut's 0.1 and
# secretion 0.1 U/min balances clearance. Push a meal in at minute 4 and the
# glucose spikes, the insulin answers, and both ring back to 1 and 1 over the
# next half hour, each overshooting the other on the way.
#
# Split form: the gut, the muscle membrane, the secretion supply and the
# clearance are the pass-ways; the two stocks, the uptake valve, the
# secretion valve and the gauges are residents. The numbers are round so the
# ledger reads by eye; nothing here is a claim about any metabolism.
system "Glucose and Insulin" : Concrete/Biological

domain "blood glucose and insulin regulating each other after a meal"

time unit minute

level Structure

interface Gut
    description "Where glucose comes in: absorption from the gut."
interface Membrane
    description "Where glucose goes out: into the muscle cells."
interface Islets
    description "Where insulin's supply comes in: the pancreas making it."
interface Clearance
    description "Where insulin goes out: broken down in the liver."

component Glucose primitive Buffering stock g initial 1 time constant 5
    description "Blood glucose; leaves at its level over 5 minutes, as far as insulin lets it."
component Uptake primitive Modulating backpressure
    description "Muscle: opens in proportion to the insulin reading, so more insulin clears more glucose."
component Insulin primitive Buffering stock U initial 1 time constant 10
    description "Blood insulin; cleared at its level over 10 minutes."
component Secretion primitive Modulating backpressure
    description "The pancreas: opens in proportion to the glucose reading, so more glucose makes more insulin."
component GlucoseGauge primitive Sensing
    description "Reads blood glucose without taking any; its gain is half."
component InsulinGauge primitive Sensing
    description "Reads blood insulin without taking any; its gain is half."

source Meal
source Pancreas
sink Tissue
sink Liver

flow Meal -> Gut : matter "absorption" substance glucose amount 0.1 unit "g/min"
flow Gut -> Glucose : matter "absorbed" substance glucose
flow Glucose -> Uptake : matter "uptake" substance glucose
flow Uptake -> Membrane : matter "uptake" substance glucose
flow Membrane -> Tissue : matter "taken up" substance glucose
flow Pancreas -> Islets : matter "supply" substance insulin amount 0.2 unit "U/min"
flow Islets -> Secretion : matter "supply" substance insulin
flow Secretion -> Insulin : matter "secreted" substance insulin
flow Insulin -> Clearance : matter "cleared" substance insulin
flow Clearance -> Liver : matter "cleared" substance insulin
flow Glucose -> GlucoseGauge : informational "glucose level"
flow GlucoseGauge -> Secretion : informational "glucose signal"
flow Insulin -> InsulinGauge : informational "insulin level"
flow InsulinGauge -> Uptake : informational "insulin signal"

param "meal" : flow Meal -> Gut "absorption" range 0..2
param "glucose time" : time constant of Glucose range 1..20
param "insulin time" : time constant of Insulin range 1..40

metric "glucose cleared" : sum into Tissue

@lens mobus
