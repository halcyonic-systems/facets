# ── SIR epidemic: three compartments and one valve ──────────────────────────
#
# Susceptible, infected, removed, as shares of a town of 1. The infection is a
# valve on the susceptibles' drain, held open in proportion to how many are
# infected: new cases = susceptibles x (gauge reading) / contact time. The
# gauge is a Sensing process whose default gain is 0.5, so with a contact time
# of 1 day the effective contact rate is 0.5 a day. Infected people recover
# with a 4-day time constant, so R0 = 0.5 x 4 = 2: past the herd threshold of
# a half, the epidemic grows, peaks and burns out. Raise the contact time and
# the peak drops by more than half.
#
# Split form: the border (imported cases) is the only pass-way; the stocks,
# the valve and the gauge are residents. A trickle of 0.005 a day crosses it so
# the town is open, which also keeps the tally honest on a long run. The
# numbers are round so the ledger reads by eye; nothing here is a claim about
# any disease.
system "SIR Epidemic" : Concrete/Biological

domain "an epidemic in a town: susceptible, infected, removed"

time unit day

level Structure

interface Border
    description "Where a trickle of imported cases arrives."

component Susceptible primitive Buffering stock share initial 0.9 time constant 1
    description "People who can still catch it; the contact time sets how fast they meet it."
component Infected primitive Buffering stock share initial 0.1 time constant 4
    description "People who have it now; each stays infectious about 4 days."
component Removed primitive Buffering stock share
    description "People who have recovered and cannot catch it again."
component Contact primitive Modulating backpressure
    description "Lets susceptibles through in proportion to the infected share."
component Gauge primitive Sensing
    description "Reads the infected share without removing anyone; its gain is half."

source Imports

flow Imports -> Border : matter "imported cases" substance people amount 0.005 unit "share/day"
flow Border -> Infected : matter "arrivals" substance people
flow Susceptible -> Contact : matter "exposure" substance people
flow Contact -> Infected : matter "new cases" substance people
flow Infected -> Removed : matter "recovery" substance people
flow Infected -> Gauge : informational "prevalence"
flow Gauge -> Contact : informational "pressure"
param "contact time" : time constant of Susceptible range 1..10
param "infectious period" : time constant of Infected range 1..10

metric "ever recovered" : sum into Removed

@lens mobus
