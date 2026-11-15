# Theory of change, take one: a healthy social system emerges and sustains
# itself when adaptable individuals, interacting by simple shared rules,
# are governed by wise leaders.
#
# This file is that sentence made testable, not a model of any society.
# The curves mean only: under these assumptions, this follows.
#
# Domain: a theory of change for a community, team or movement.
# Shape: one memory stock fed through a pass-way whose rate a leader sets,
# showing its level to the world as its output.
#
# Individuals  are the environment: they offer interactions, 10 a month
#              to start. Their rate is the only place "individuals" live.
# Norms        is the shared rules, the pass-way where interactions become
#              shared practice. How much gets through is the leader's call.
# Cohesion     is the health (Buffering, informational): a memory that adds
#              up shared practice and forgets at level / 6 months.
#              Health is not a thing you have; it is a thing you keep making.
# Leader       is an agent. It watches cohesion, averages its last 6
#              readings, and admits gain x (target - mean) interactions a
#              month, never below zero. "Wise" here means: has a goal, acts
#              in proportion, looks at the trend. The window is the wisdom
#              knob, and the model has something to say about it (below).
#
# Results      is the output pass-way: the system shows its cohesion to the
#              World as wellbeing, copied, not spent. The impact end of
#              the chain, so the system does work for someone.
#
# Gasquez's chain: input = interactions; activity = norms; output = shared
# practice; outcome = cohesion; impact = wellbeing shown; the leader is
# the mechanism in the arrow from outcome back to activity. Every param is an assumption with a range.
#
# What the engine cannot say yet, said out loud:
#   - no crowd of individuals, so "adaptable" has no knob (v1: mass action
#     between aligned and unaligned people, the SIR pattern)
#   - rules and leader are one arrow: the leader IS the norms' setting
#   - a gate on an information flow cannot be written: Modulating throttles
#     matter and energy only, and a memory takes only informational inflows
#     (found 2026-11-06 building this file). Hence the command form.
#   - no noise. Readings are exact, so a memory has nothing to smooth.
#
# What to expect (facets bench --t 60):
#   - Baseline: cohesion climbs from 20, peaks at 36 in month 5, and
#     settles near 30, swinging 27 to 32, while the leader admits about
#     5 interactions a month. It never reaches 40: a proportional leader
#     settles where gain x (target - level) = level / forgetting, here 30.
#     The goal you aim at is not the level you get.
#   - window 1: settles at exactly 30 by month 12, no swing. The leader
#     with no memory does best. In a model with no noise, memory is only
#     lag, and lag in a loop is overshoot. Wisdom-as-patience pays only
#     when readings are noisy, and the engine cannot say noisy yet.
#   - window 12: same peak, still swinging 27 to 33 at month 60.
#   - gain 0.1 (gentle): sinks to 15 and stays. A leader who barely
#     responds lets the system forget faster than it is fed.
#   - gain 1 (heavy hand): peak 57, then swings 17 to 57 with months of
#     zero interaction. Firmness plus memory is instability.
#   - target 80, above the ceiling: peak 88, swings 48 to 69, the leader
#     pinned between 0 and 30 interactions. Wanting more than the system
#     can hold produces lurching, not more.
#   - forgetting 3: settles at 24 with 8 interactions a month. A society
#     that forgets fast needs constant feeding for less.
#   - forgetting 12: peak 44, swings 29 to 39. Slow forgetting makes the
#     leader's lag worse, not better.
#
# Knobs to try live: memory (window), firmness (gain), what healthy
# looks like (target), forgetting (time constant). The interactions param
# is the leader's to write, so moving its slider by hand is overridden
# each month.
system "Theory of Change" : Concrete/Social

domain "a theory of change for a community: individuals, shared rules, a leader, and the cohesion they keep"

time unit month

environment Individuals
    description "The people; they offer interactions."

interface Norms
    description "The shared rules: where interactions become shared practice. The leader sets how much gets through."
component Cohesion primitive Buffering stock cohesion initial 20 time constant 6 informational
    description "The health of the system: a memory of what passed the norms, forgetting over 6 months."
interface Results
    description "What the system shows the world: its wellbeing, read off its cohesion."
sink World
    description "Everyone outside who feels the system's health or its absence."

flow Individuals -> Norms : informational "interactions" amount 10 unit "interactions/month"
flow Norms -> Cohesion : informational "shared practice"
flow Cohesion -> Results : informational "wellbeing"
flow Results -> World : informational "wellbeing"

param "interactions" : flow Individuals -> Norms "interactions" range 0..40

agent Leader watches Cohesion rule trace window 6 target 40 gain 0.5 manages param "interactions"
    description "Watches cohesion, averages its last 6 readings, sets how many interactions the norms admit."

param "forgetting" : time constant of Cohesion range 1..24
param "memory" : window of Leader range 1..24
param "what healthy looks like" : target of Leader range 5..80
param "firmness" : gain of Leader range 0.01..1

metric "wellbeing shown" : sum into World

@lens mobus
