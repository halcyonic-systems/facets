# Theory of change, candidate B: the rules remembered. Five things inside.
#
# Candidate A with the rules taken out of the meeting's rate and given a
# place of their own: a memory. Rules are forgotten over about a year
# unless someone keeps teaching them. The leader's job here is not to
# convene but to keep the rules alive: it watches how many take part and
# sets how much teaching comes in. The meeting's own rate is fixed.
#
# Newcomers    the environment: 2 people a month arrive, disengaged.
# Tradition    the environment the rules come from: what the community
#              inherited and can be taught again.
# Disengaged   people around but not taking part. Drift away over two years.
# Engaged      people taking part. Each drifts back over about a year.
# Encounter    the meeting (Combining, mass action 0.002): joining at
#              k x disengaged x engaged x norms a month. The engaged and the
#              norms are read, not used up.
# Norms        the shared rules (Buffering, informational): a memory of
#              what has been taught, forgotten over a year, read by every
#              meeting.
# Leader       an agent inside: watches how many take part and sets the
#              teaching by a table. Teaches hard when few take part, less as
#              more do.
# Arrival, Teaching, Leaving are the three doors on the membrane.
#
# Gasquez's chain: activity = meeting under the rules; output = joining
# (the metric); outcome = the Engaged curve. The theory lives in two
# arrows: norms x meeting (rules shape practice) and leader -> teaching
# (leadership keeps the rules alive).
#
# What to expect (bench, 60 months):
#   baseline: engaged climbs from 10 to 40 over four years and holds at the
#     leader's line; norms rise to 1.2 while few take part, then ease to 1
#   no leader (delete the agent line), teaching left at 0.04: norms hold at
#     0.5 and engaged fades from 10 to 3; at 0.1 engaged climbs to 46; at
#     0.2 past 100
#   norms last 3 (rules forgotten in a season): engaged fades to 1 even
#     with the leader teaching hard
# The leader's table pins the teaching, so pinning that knob under it does
# nothing; take the leader out to see teaching on its own.
# Knobs: teaching (the leader's own), arrivals, drift, leaving, norms last,
# meeting.

system "Theory of Change (B: the rules remembered)" : Concrete/Social
domain "a community of 100. The adaptable individuals are the two people stocks; the simple shared rules are the norms, a memory; the wise leader is the agent who keeps them taught"
description "Healthy social systems emerge and can sustain themselves when adaptable individuals, interacting according to simple shared rules, are governed by wise leaders. (https://davidgasquez.com/handbook/theory-of-change)"
time unit month
environment Newcomers
    description "People arriving from outside, 2 a month, disengaged."
environment Tradition
    description "Where the rules come from: what the community inherited and can be taught again."
sink World
    description "Where people who left have gone."
interface Arrival
    description "Where newcomers come in."
interface Teaching
    description "Where the rules are taught: the leader sets how much."
interface Leaving
    description "Where people leave the community for good."
component Disengaged primitive Buffering stock people initial 90 time constant 24
    description "Adaptable individuals who do not yet take part. The meeting draws on them; the rest drift away over two years. Adaptable here means only: able to move to taking part and back."
component Engaged primitive Buffering stock people initial 10 time constant 12
    description "Adaptable individuals who take part. This is the healthy social system, and it does not stay had: each drifts back to the sidelines over about a year unless brought in again."
component Encounter primitive Combining mass action 0.002
    description "Individuals interacting according to the shared rules: a disengaged person meets an engaged one and joins, at k x disengaged x engaged x norms a month."
component Norms primitive Buffering stock norms initial 0.5 time constant 12 informational
    description "The simple shared rules: a memory of what has been taught, forgotten over about a year, multiplying every meeting."
flow Newcomers -> Arrival : matter "arrivals" substance people amount 2 unit "people/month"
    description "Two people a month arrive from outside. Nobody arrives engaged; taking part is something the community has to produce."
flow Arrival -> Disengaged : matter "arrivals" substance people
    description "Newcomers start on the sidelines."
flow Tradition -> Teaching : informational "teaching" amount 0.04 unit "rules/month"
    description "Rules taught from what the community inherited. The leader sets how much. The claim: rules are kept alive by teaching, not written once."
flow Teaching -> Norms : informational "teaching"
    description "What is taught enters the shared memory of rules."
flow Disengaged -> Encounter : matter "meeting" substance people
    description "The meeting draws on the disengaged: these are the people who can still be brought in. The claim: joining happens by meeting, not by being told."
flow Disengaged -> Leaving : matter "leaving" substance people
    description "People who never take part drift away over about two years. Disengagement is not stable; it leaks."
flow Leaving -> World : matter "leaving" substance people
    description "Those who left are gone for good."
flow Engaged -> Encounter : informational "presence"
    description "The engaged are present at every meeting and are not used up by it. The claim: participation is contagious in proportion to how many already take part."
flow Norms -> Encounter : informational "rules"
    description "The shared rules multiply every meeting. The claim: the same meeting produces more joining when the rules are alive and almost none when they are forgotten. This is where the simple shared rules of the sentence live."
flow Encounter -> Engaged : matter "joining" substance people
    description "What a meeting produces: a disengaged person who now takes part."
flow Engaged -> Disengaged : matter "drifting" substance people
    description "Taking part decays. Each engaged person drifts back over about a year unless brought in again. The claim: a healthy social system sustains itself only while the meeting keeps running; health is kept, not had."
param "teaching" : flow Tradition -> Teaching "teaching" range 0.005..0.2
param "arrivals" : flow Newcomers -> Arrival "arrivals" range 0..10
param "drift" : time constant of Engaged range 1..36
param "leaving" : time constant of Disengaged range 6..120
param "norms last" : time constant of Norms range 1..36
param "meeting" : mass action of Encounter range 0.0005..0.008
agent Leader watches Engaged rule table under 40 emit 0.1 under 80 emit 0.04 else 0.01 manages param "teaching"
    description "The wise leader. Governs by watching how many take part and setting the teaching each month: hard under 40, lightly under 80, barely at all above. The claim: wise leadership keeps the rules alive and works through them, not on the people."
metric "joining" : sum into Engaged

@lens mobus
@system 480 311.58237
@pos Newcomers 8.320618 5.547119
@pos Tradition -70 300
@pos World 1084.478 121.45755
@pos Arrival 226.14056 146.87315
@pos Teaching 177 312
@pos Leaving 733.85944 146.87315
@pos Disengaged 474.44473 167.54019
@pos Engaged 726.04535 485.02826
@pos Encounter 345 450
@pos Norms 305 285
@pos Leader 420 600
