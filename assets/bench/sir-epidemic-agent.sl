# ── An epidemic the public reacts to ────────────────────────────────────────
# bench · after the behavioural SIR model (a public that stays home) — Mobus 2022 §11.2.1.1
#
# The same epidemic as sir-epidemic.sl with one decision in it: the public
# watches the infected share and, at or above a level, cuts its contacts to
# a fraction of normal, resuming them below it. The control peaks at 0.26
# on day 8; here the peak is lower and later, and the epidemic lingers,
# which is what distancing buys and what it costs. The level and the
# fraction are the two knobs a public health model argues about.
system "SIR Epidemic (public)" : Concrete/Biological

domain "an epidemic in a town whose people stay home when it is bad"

time unit day

level Structure

interface Border
    description "Where cases arrive from elsewhere."

component Susceptible primitive Buffering stock share initial 0.9 time constant 1
    description "The share not yet infected; they meet others at the contact rate."
component Infected primitive Buffering stock share initial 0.1 time constant 4
    description "The share currently infectious; each recovers after about four days."
component Removed primitive Buffering stock share
    description "The share recovered or dead; absorbing."
component Contact primitive Modulating backpressure
    description "Infection: exposure becomes new cases in proportion to prevalence."
component Gauge primitive Sensing gain 0.5
    description "Reads prevalence for the contact process."
agent Public watches Infected rule threshold above 0.15 emit 0.3 else 1 manages Susceptible
    description "Watches the infected share; stays home at or above the level, goes out below it."

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
param "alarm level" : above of Public range 0.02..0.5

metric "ever recovered" : sum into Removed

@lens mobus
