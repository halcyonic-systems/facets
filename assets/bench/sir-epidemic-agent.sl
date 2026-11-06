# ── An epidemic the public reacts to ────────────────────────────────────────
# bench · after the behavioural SIR model (a public that stays home) — Mobus 2022 §11.2.1.1
#
# The same epidemic as sir-epidemic.sl with one decision in it: the public
# watches the infected share and, at or above a level, cuts the contact
# rate (the encounter's k, #584) to a fraction of normal, resuming it below
# the level. The control peaks at 0.26 on day 8; here the cut lands the
# day after the alarm, so the first days run uncut and the peak is 0.18
# on day 3, then the epidemic lingers above a tenth four days longer,
# which is what distancing buys and what it costs. The level and the fraction are the two knobs a public health
# model argues about. Before #584 the public held a valve on the
# susceptibles' release instead, the sensor-and-valve idiom row 48 retired.
system "SIR Epidemic (public)" : Concrete/Biological

domain "an epidemic in a town whose people stay home when it is bad"

time unit day

level Structure

interface Border
    description "Where cases arrive from elsewhere."

component Susceptible primitive Buffering stock share initial 0.9
    description "People who can still catch it; the encounter draws on them."
component Infected primitive Buffering stock share initial 0.1 time constant 4
    description "The share currently infectious; each recovers after about four days."
component Removed primitive Buffering stock share
    description "The share recovered or dead; absorbing."
component Infection primitive Combining mass action 0.5
    description "Susceptibles meeting the infected: new cases at the contact rate times both shares."

source Imports

flow Imports -> Border : matter "imported cases" substance people amount 0.005 unit "share/day"
flow Border -> Infected : matter "arrivals" substance people
flow Susceptible -> Infection : matter "exposure" substance people
flow Infected -> Infection : informational "contacts"
flow Infection -> Infected : matter "new cases" substance people
flow Infected -> Removed : matter "recovery" substance people
param "contact rate" : mass action of Infection range 0.05..0.5
param "infectious period" : time constant of Infected range 1..10

agent Public watches Infected rule threshold above 0.15 emit 0.15 else 0.5 manages param "contact rate"
    description "Watches the infected share; at or above the level it cuts the contact rate to a fraction, below it goes out again."
param "alarm level" : above of Public range 0.02..0.5

metric "ever recovered" : sum into Removed

@lens mobus
