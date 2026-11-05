# ── SIR epidemic: three compartments and one encounter ──────────────────────
# bench · after Kermack & McKendrick 1927 (the SIR compartment model)
#
# Susceptible, infected, removed, as shares of a town of 1. The infection is
# an encounter, a Combining process with a mass-action law (facets#573): new
# cases = contact rate x susceptibles x infected, a day. The susceptibles are
# drawn on and the infected are read, not used up. At a contact rate of 0.5 a
# day, with a 4-day recovery time constant, R0 = 0.5 x 4 = 2: past the herd
# threshold of a half, the epidemic grows, peaks and burns out. Halve the
# contact rate and the peak drops by more than half. (Before facets#577 the
# encounter was a valve on the susceptibles' drain held open by a gauge on
# the infected; the run is the same, and the agent variant keeps that form.)
#
# Split form: the border (imported cases) is the only pass-way; the stocks
# and the encounter are residents. A trickle of 0.005 a day crosses it so
# the town is open, which also keeps the tally honest on a long run. The
# numbers are round so the ledger reads by eye; nothing here is a claim about
# any disease.
#
# What this model assumes, and where each assumption fails (the point of
# keeping it on the bench): everyone mixes with everyone (no households, no
# network, no geography); the contact rate is a constant knob (people do not
# change behaviour as the count rises); recovery is a fixed time constant (no
# treatment, no variation); immunity is permanent (no waning, no reinfection);
# the town is closed but for a trickle (no births, deaths or travel); and
# "infected" is one compartment (no incubation, no asymptomatic spread). Each
# is a knob this model cannot turn. A forecast built on it is a forecast of the
# assumptions. Turn the contact rate and watch R0 do all the work.
system "SIR Epidemic" : Concrete/Biological

domain "an epidemic in a town: susceptible, infected, removed"

time unit day

level Structure

interface Border
    description "Where a trickle of imported cases arrives."

component Susceptible primitive Buffering stock share initial 0.9
    description "People who can still catch it; the encounter draws on them."
component Infected primitive Buffering stock share initial 0.1 time constant 4
    description "People who have it now; each stays infectious about 4 days."
component Removed primitive Buffering stock share
    description "People who have recovered and cannot catch it again."
component Infection primitive Combining mass action 0.5
    description "Susceptibles meeting the infected: new cases at the contact rate times both shares."

source Imports

flow Imports -> Border : matter "imported cases" substance people amount 0.005 unit "share/day"
flow Border -> Infected : matter "arrivals" substance people
flow Susceptible -> Infection : matter "exposure" substance people
flow Infected -> Infection : informational "contacts"
flow Infection -> Infected : matter "new cases" substance people
flow Infected -> Removed : matter "recovery" substance people
param "infectious period" : time constant of Infected range 1..10

metric "ever recovered" : sum into Removed

@lens mobus
