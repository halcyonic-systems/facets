# ── A hospital ward: beds fill, and then they are full ──────────────────────
#
# Eight patients a day are admitted to a ward of 40 beds and each stays about
# four days, so the beds settle at 8 x 4 = 32 occupied, 80% full. The ward
# empties at its occupancy over the length of stay. Stretch the stay to six
# days and the same admissions want 48 beds: the ward fills to 40, stays
# there, and every patient beyond that has nowhere to go. The overflow is
# dissipated by the ledger, which is what a diversion to another hospital is
# to this ward; the tick log shows it, tick by tick.
#
# Split form: the admissions desk and the discharge door are the pass-ways;
# the ward is a resident. The numbers are round so the ledger reads by eye;
# nothing here is a claim about any hospital.
system "Hospital Beds" : Concrete/Technical

domain "a ward that fills from admissions and empties by discharge"

time unit day

level Structure

interface Admissions
    description "Where patients come in: the admissions desk."
interface Discharge
    description "Where patients go out: the discharge door."

component Ward primitive Buffering stock beds initial 24 capacity 40 time constant 4
    description "The occupied beds; full at 40, emptying at the occupancy over the length of stay."

source Referrals
sink Home

flow Referrals -> Admissions : matter "arrivals" substance patients amount 8 unit "patients/day"
flow Admissions -> Ward : matter "admitted" substance patients
flow Ward -> Discharge : matter "discharged" substance patients
flow Discharge -> Home : matter "discharged" substance patients

param "admissions" : flow Referrals -> Admissions "arrivals" range 0..20
param "length of stay" : time constant of Ward range 1..10
param "beds" : capacity of Ward range 10..80

metric "discharged" : sum into Home

@lens mobus
