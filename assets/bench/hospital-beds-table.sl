# ── A ward with a gatekeeper who reads a table ──────────────────────────────
# bench · after the bed-management ward with a graded admissions policy — Mobus 2022 §11.2.1.1
#
# The same ward as hospital-beds-agent.sl with the gatekeeper's one level
# replaced by a program of response: under 20 beds admissions are open, from
# 20 to under 36 they are halved, at 36 and over they are shut. Mobus's
# purely reactive agent with "an algorithmic or heuristic program of
# response"; three bins, no memory. Against hospital-beds-agent.sl at the
# four-day stay the relay never closes and the ward settles at 32; the table
# halves admissions from 20 beds, so the ward saws between 19.4 and 22.9
# across its first bound and discharges 128 patients in 24 days against the
# relay's 184. At a six-day stay the control pins at 40 and turns patients
# away, the relay saws between 30 and 38, and the table holds 24 beds
# exactly, 4 admitted a day against 4 discharged, never near its shut level.
# The bins are contiguous by construction, so a table whose bounds do not
# rise is refused.
system "Hospital Beds (table)" : Concrete/Technical

domain "a ward whose admissions are graded by how full it is"

time unit day

level Structure

interface Admissions
    description "The door: referrals arrive here."
interface Discharge
    description "The other door: patients go home."

component Triage primitive Modulating backpressure
    description "Admits arrivals as far as the gatekeeper's table allows."
component Ward primitive Buffering stock beds initial 24 capacity 40 time constant 4
    description "Occupied beds; each stay ends after about four days."
agent Gatekeeper watches Ward rule table under 20 emit 1 under 36 emit 0.5 else 0 manages Triage
    description "Counts the beds and reads the table: open under 20, halved to 36, shut from there."

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

metric "discharged" : sum into Home

@lens mobus
