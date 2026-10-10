# ── A ward with a gatekeeper ────────────────────────────────────────────────
# bench · after the bed-management ward with an admissions gate — Mobus 2022 §12.2.3.1
#
# The same ward as hospital-beds.sl with one decision in it: a gatekeeper
# watches the beds and shuts admissions at or above a level, opening them
# again below it. The control fills to its ceiling and turns a patient away
# every day as overflow; this one never overflows, and occupancy saws
# between the level and the discharge rate. Same beds, same stay, same
# arrivals; the only difference is who decides.
system "Hospital Beds (gatekeeper)" : Concrete/Technical

domain "a ward whose admissions close when the beds run short"

time unit day

level Structure

interface Admissions
    description "The door: referrals arrive here."
interface Discharge
    description "The other door: patients go home."

component Triage primitive Modulating backpressure
    description "Admits arrivals when the gatekeeper says the ward can take them."
component Ward primitive Buffering stock beds initial 24 capacity 40 time constant 4
    description "Occupied beds; each stay ends after about four days."
agent Gatekeeper watches Ward rule threshold above 36 emit 0 else 1 manages Triage
    description "Counts the beds; shuts admissions at or above the level, opens them below it."

source Referrals
sink Home

flow Referrals -> Admissions : matter "arrivals" substance patients amount 8 unit "patients/day"
flow Admissions -> Triage : matter "arrivals" substance patients
flow Triage -> Ward : matter "admitted" substance patients
flow Ward -> Discharge : matter "discharged" substance patients
flow Discharge -> Home : matter "discharged" substance patients

param "admissions" : flow Referrals -> Admissions "arrivals" range 0..20
param "length of stay" : time constant of Ward range 1..10
param "beds" : capacity of Ward range 10..80
param "closes at" : above of Gatekeeper range 10..40

metric "discharged" : sum into Home

@lens mobus
