# Theory of change, candidate A: the meeting. Four things inside.
#
# The smallest version of the sentence that still runs. People are either
# taking part or not. Taking part spreads by meeting: a disengaged person
# meets an engaged one and joins. The simple shared rules are folded into
# one number, how readily a meeting turns into joining. The leader sets
# that number. Nothing else is inside.
#
# Newcomers    the environment: 2 people a month arrive, disengaged.
# Disengaged   people around but not taking part. Drift away over two years.
# Engaged      people taking part. Each drifts back over about a year.
# Encounter    the meeting (Combining, mass action): joining happens at
#              k x disengaged x engaged a month. The engaged are present,
#              not used up. k is the rules.
# Leader       an agent inside: watches how many take part and sets k by a
#              table. Convenes hard when few take part, eases off as more do.
# Arrival, Leaving are the two doors on the membrane. World is where the
# leavers go.
#
# Gasquez's chain: activity = meeting; output = joining (the metric);
# outcome = the Engaged curve; impact is not drawn. Candidate C draws it.
#
# What to expect (bench, 60 months):
#   baseline: engaged climbs from 10 to 48 in the first year, then creeps
#     to 57 as newcomers accumulate; the disengaged hold near 43
#   no leader (delete the agent line), k left at 0.001: engaged fades
#     from 10 to 3; at 0.002 it climbs to 41; at 0.004 past 100
#   drift 3 (people drift back in a season): engaged fades to 0 even
#     with the leader
#   arrivals 0: engaged peaks at 42 then fades as the town empties
# The leader's table pins k, so pinning the convening knob under it does
# nothing; take the leader out to see k on its own.
# Knobs: convening (the leader's own), arrivals, drift, leaving.

system "Theory of Change (A: the meeting)" : Concrete/Social
domain "a community of 100. The adaptable individuals are the two people stocks; the simple shared rules are the meeting's rate; the wise leader is the agent who sets it"
description "Healthy social systems emerge and can sustain themselves when adaptable individuals, interacting according to simple shared rules, are governed by wise leaders. (https://davidgasquez.com/handbook/theory-of-change)"
time unit month
environment Newcomers
    description "People arriving from outside, 2 a month, disengaged."
sink World
    description "Where people who left have gone."
interface Arrival
    description "Where newcomers come in."
interface Leaving
    description "Where people leave the community for good."
component Disengaged primitive Buffering stock people initial 90 time constant 24
    description "Adaptable individuals who do not yet take part. The meeting draws on them; the rest drift away over two years. Adaptable here means only: able to move to taking part and back."
component Engaged primitive Buffering stock people initial 10 time constant 12
    description "Adaptable individuals who take part. This is the healthy social system, and it does not stay had: each drifts back to the sidelines over about a year unless brought in again."
component Encounter primitive Combining mass action 0.001
    description "Individuals interacting according to simple shared rules: a disengaged person meets an engaged one and joins, at k x disengaged x engaged a month. k is the rules, folded into one number: how readily a meeting becomes joining."
flow Newcomers -> Arrival : matter "arrivals" substance people amount 2 unit "people/month"
    description "Two people a month arrive from outside. Nobody arrives engaged; taking part is something the community has to produce."
flow Arrival -> Disengaged : matter "arrivals" substance people
    description "Newcomers start on the sidelines."
flow Disengaged -> Encounter : matter "meeting" substance people
    description "The meeting draws on the disengaged: these are the people who can still be brought in. The claim: joining happens by meeting, not by being told."
flow Disengaged -> Leaving : matter "leaving" substance people
    description "People who never take part drift away over about two years. Disengagement is not stable; it leaks."
flow Leaving -> World : matter "leaving" substance people
    description "Those who left are gone for good."
flow Engaged -> Encounter : informational "presence"
    description "The engaged are present at every meeting and are not used up by it. The claim: participation is contagious in proportion to how many already take part."
flow Encounter -> Engaged : matter "joining" substance people
    description "What a meeting produces: a disengaged person who now takes part."
flow Engaged -> Disengaged : matter "drifting" substance people
    description "Taking part decays. Each engaged person drifts back over about a year unless brought in again. The claim: a healthy social system sustains itself only while the meeting keeps running; health is kept, not had."
param "convening" : mass action of Encounter range 0.0005..0.008
param "arrivals" : flow Newcomers -> Arrival "arrivals" range 0..10
param "drift" : time constant of Engaged range 1..36
param "leaving" : time constant of Disengaged range 6..120
agent Leader watches Engaged rule table under 40 emit 0.004 under 80 emit 0.002 else 0.001 manages param "convening"
    description "The wise leader. Governs by watching how many take part and setting the meeting's rate each month: hard under 40, steady under 80, lightly above. The claim: wise leadership works on how much meeting happens, not on the people."
metric "joining" : sum into Engaged

@lens mobus
@system 480 311.58237
@pos Newcomers 8.320618 5.547119
@pos World 1084.478 121.45755
@pos Arrival 226.14056 146.87315
@pos Leaving 733.85944 146.87315
@pos Disengaged 474.44473 167.54019
@pos Engaged 726.04535 485.02826
@pos Encounter 272.79587 417.78064
@pos Leader 541.2298 588.3728
