# Theory of change, take three: the sentence built the way it asked to be
# built, with the Facets change it needed (#584, 2026-11-06), then cut to
# what the sentence needs (Shingai, 2026-11-06: fewer things inside,
# but something must come in).
#
# The sentence: a healthy social system emerges and sustains itself when
# adaptable individuals, interacting by simple shared rules, are governed
# by wise leaders. This file is that sentence made testable, not a model
# of any society. The curves mean only: under these assumptions, this
# follows. Takes one and two are theory-of-change.sl and
# theory-of-change-v1.sl.
#
# A community with turnover: 2 newcomers a month arrive disengaged, and
# the disengaged drift away over about two years. Inside, people move
# between taking part and not.
#
# Newcomers    the environment: who arrives, 2 a month.
# Disengaged   people around but not taking part. The encounter draws on
#              them.
# Engaged      people taking part. Each drifts back over about a year.
# Encounter    practice (Combining, mass action): a disengaged person meets
#              an engaged one and joins, at k x disengaged x engaged x norms
#              a month. The engaged are read, not used up; so are the norms.
# Example      engaged people set examples (Sensing, gain 0.001): what they
#              do becomes what is expected.
# Norms        the shared rules (Buffering, informational): a memory of
#              examples, forgotten over a year, read by every encounter.
# Leader       an agent inside. It watches the engaged and sets k by a
#              table: 0.008 under 40, 0.002 under 80, 0.0005 above. "Wise"
#              here means: convenes hard when few take part, eases off as
#              more do, and works through the rate of meeting, not the
#              people.
# Moderation   a gate on messages (Modulating fed only messages, Facets
#              #587): the share of examples that become expected. Who
#              decides what counts as a rule.
# Moderator    a second agent: lets every example through while the rules
#              are thin, admits a fifth once they pass 0.45, reopens under 0.3.
# Health       reads how many take part, for the world. The output.
# Arrival, Leaving, Results are the three doors on the membrane.
#
# Why the two sensors are there: a people stock read straight into an
# interface or into the norms is drained by the reading (tested
# 2026-11-06: the town fell from 100 to 26). A Sensing process is the one
# reader that takes nothing. Every transformation is a work process in
# Mobus, so each is a thing inside the membrane; that is the cost of
# soundness, and the reason the picture has seven things, not four.
#
# Gasquez's chain: activity = encounters under the norms; output = people
# joining; outcome = how many take part; impact = that number shown to the
# world. The theory lives in three arrows: norms x encounter (rules shape
# practice), example -> moderation -> norms (practice renews rules, through
# whoever gates them), leader -> k (leadership sets how much meeting
# happens).
#
# What the engine cannot say yet, said out loud:
#   - the leader eats nothing, and reads one stock
#   - "adaptable" is still not a knob: a learning rule (#522) or a system's
#     adaptability (#334) waits on theory
#   - the leader's table is a step function; a proportional rule cannot
#     command k, because its span starts at zero and a law at zero is no law
#
# What to expect (facets bench --t 60):
#   - Baseline: engaged climbs from 10 to about 38 by month 12 and holds
#     between 37 and 45; the norms rest near 0.45; the town is about 90. The leader convenes hard for the first
#     months (k 0.008), then eases to 0.002 as the engaged pass 40.
#   - Leader pinned low (every k 0.0005): engagement collapses to 0.
#     Without convening, drift wins.
#   - Leader pinned high (every k 0.008): 136 take part by month 60,
#     nearly everyone, and the town grows because nobody leaves.
#     Convening without easing off empties the sidelines.
#   - Norms forgotten in 3 months: collapse to 0.2. The rules are the
#     multiplier; forget them and no amount of convening works.
#   - The moderator (gate at 0.45, reopening at 0.3): engaged holds near
#     38 instead of 42, and with the leader pinned high 100 take part
#     instead of 136. Gating what becomes a rule caps the culture, and so
#     caps what convening can do. Set the ceiling to 5 (never trips) to
#     see the ungated run; 0.3 and 0.2 for a strict one (near 37).
#
# Knobs to try live: the leader's three k values (emit1, emit2, else),
# norms last, drift, leaving, arrivals, example, rules ceiling.
system "Theory of Change (v2)" : Concrete/Social

domain "a community of 100. The adaptable individuals are the two people stocks; the simple shared rules are the norms, a memory renewed by example; the wise leader is the agent who sets how much meeting happens"
description "Healthy social systems emerge and can sustain themselves when adaptable individuals, interacting according to simple shared rules, are governed by wise leaders. (https://davidgasquez.com/handbook/theory-of-change)"

time unit month

environment Newcomers
    description "People arriving from outside, 2 a month, disengaged."
sink World
    description "Everyone outside who sees how many take part."
interface Arrival
    description "Where newcomers come in."
interface Leaving
    description "Where people leave the community for good."
interface Results
    description "Where the community shows how many take part."

component Disengaged primitive Buffering stock people initial 90 time constant 24
    description "Adaptable individuals who do not yet take part. The encounter draws on them; the rest drift away over two years. Adaptable here means only: able to move to taking part and back."
component Engaged primitive Buffering stock people initial 10 time constant 12
    description "Adaptable individuals who take part. This is the healthy social system, and it does not stay had: each drifts back to the sidelines over about a year unless brought in again."
component Encounter primitive Combining mass action 0.002
    description "Individuals interacting according to the shared rules: a disengaged person meets an engaged one and joins, at k x disengaged x engaged x norms."
component Example primitive Sensing gain 0.001
    description "Engaged people set examples: a thousandth of their number a month becomes expected."
component Moderation primitive Modulating
    description "Who decides what becomes a rule: a gate on messages (Facets #587). It passes the share of examples the moderator allows to become expected."
component Norms primitive Buffering stock norms initial 0.5 time constant 12 informational
    description "The simple shared rules: a memory of examples set, forgotten over a year, multiplying every encounter."
component Health primitive Sensing gain 1
    description "Whether the social system is healthy: how many take part, read for the world. A sensor is the only reader that takes nothing."
agent Moderator watches Norms rule threshold above 0.45 below 0.3 emit 0.2 else 1 manages Moderation
    description "A conservative gatekeeper: while the rules are thin it lets every example become expected; once they pass 0.45 it admits a fifth, until they thin back under 0.3. The claim: who gates the rules shapes the culture as much as who convenes."

flow Newcomers -> Arrival : matter "arrivals" substance people amount 2 unit "people/month"
    description "Two people a month arrive from outside. Nobody arrives engaged; taking part is something the community has to produce."
flow Arrival -> Disengaged : matter "arrivals" substance people
    description "Newcomers start on the sidelines."
flow Disengaged -> Encounter : matter "meeting" substance people
    description "The encounter draws on the disengaged: these are the people who can still be brought in. The claim: joining happens by meeting, not by being told."
flow Disengaged -> Leaving : matter "leaving" substance people
    description "People who never take part drift away over about two years. Disengagement is not stable; it leaks."
flow Leaving -> World : matter "leaving" substance people
    description "Those who left are gone for good."
flow Engaged -> Encounter : informational "presence"
    description "The engaged are present at every encounter and are not used up by it. The claim: participation is contagious in proportion to how many already take part."
flow Norms -> Encounter : informational "rules"
    description "The shared rules multiply every encounter. The claim: the same meeting produces more joining when the rules are alive and almost none when they are forgotten. This is where the simple shared rules of the sentence live."
flow Encounter -> Engaged : matter "joining" substance people
    description "What an encounter produces: a disengaged person who now takes part."
flow Engaged -> Disengaged : matter "drifting" substance people
    description "Taking part decays. Each engaged person drifts back over about a year unless brought in again. The claim: health is kept, not had."
flow Engaged -> Example : informational "engagement"
    description "Engaged people are seen taking part; the sensor reads how many without taking any."
flow Example -> Moderation : informational "examples"
    description "What the engaged do, offered as what should be expected: a thousandth of their number a month. The claim: rules are renewed by practice, not written once."
flow Moderation -> Norms : informational "accepted"
    description "The examples the moderator let through become the norms. Messages copy, so what the gate stops is not held anywhere; it is simply never expected."
flow Engaged -> Health : informational "engagement"
    description "The count of people taking part, read without draining it."
flow Health -> Results : informational "taking part"
    description "How many take part is the outcome the world sees."
flow Results -> World : informational "taking part"
    description "The impact: a community whose health is visible from outside."
param "convening" : mass action of Encounter range 0.0005..0.008

param "arrivals" : flow Newcomers -> Arrival "arrivals" range 0..10
param "drift" : time constant of Engaged range 1..36
param "leaving" : time constant of Disengaged range 6..120
param "norms last" : time constant of Norms range 1..36
param "example" : gain of Example range 0.0001..0.1
param "rules ceiling" : above of Moderator range 0.2..5

agent Leader watches Engaged rule table under 40 emit 0.008 under 80 emit 0.002 else 0.0005 manages param "convening"
    description "The wise leader. Governs by watching how many take part and setting the encounter's rate each month: hard under 40, lightly under 80, barely at all above. The arrow from the leader to the encounter is that command (Facets #588); the claim it carries is that wise leadership works on how much meeting happens, not on the people."

metric "taking part shown" : sum into World

@lens mobus
