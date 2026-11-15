# Theory of change, take two: the same sentence, with Shingai's four
# corrections of 2026-11-06. Individuals live inside the system and are
# sustained by resources; norms are a thing of their own that informs the
# individuals; the leader's work is renewing the norms; cohesion is what
# leaves the system and gets measured.
#
# The sentence: a healthy social system emerges and sustains itself when
# adaptable individuals, interacting by simple shared rules, are governed
# by wise leaders. This file is that sentence made testable, not a model
# of any society. The curves mean only: under these assumptions, this
# follows. Take one is theory-of-change.sl: smaller, and it tells the
# lag story more cleanly.
#
# Domain: a theory of change for a community, team or movement.
# Shape: resources feed a stock of people who spend effort through a
# valve the norms set; the effort builds cohesion, which drains to the
# world as wellbeing; a leader reads cohesion and renews the norms.
#
# Resources    the environment: 12 units a month of whatever the community
#              lives on.
# Individuals  a stock inside (Buffering, matter): their capacity. It costs
#              2 a month to sustain (maintenance) and they offer 10 a month
#              as effort (release).
# Practice     a valve (Modulating, backpressure): how much of the effort
#              becomes shared practice. The norms' level is its setting;
#              effort the norms do not admit stays with the individuals.
# Norms        a memory (Buffering, informational): the shared rules. The
#              leader renews them, everyone forgets them over 12 months,
#              and their level, copied, governs Practice.
# Cohesion     a stock (Buffering, matter): social capital. It drains to
#              the world at level / 6, and that drain is the measurement.
# Leader       an agent inside. It reads cohesion and renews the norms by
#              gain x (target - cohesion) a month, never below zero. Its
#              renewal enters through Mandate, an interface, because a
#              flow must start somewhere and the engine's agent has no
#              hands of its own. "Wise" here means: has a goal, acts in
#              proportion, works on the rules rather than the people.
#
# Gasquez's chain: inputs = resources; activity = practice under the
# norms; output = shared practice; outcome = cohesion; impact = wellbeing
# delivered. The theory lives in two arrows: norms -> practice (rules
# shape behaviour) and leader -> norms (leadership renews rules).
#
# What the engine cannot say yet, said out loud:
#   - the leader eats nothing: an agent takes no maintenance, so "resources
#     sustain the leaders" has no knob
#   - the leader reads one stock, so it cannot read both cohesion and
#     the norms; it governs by the outcome alone
#   - nobody reads the norms but the valve: the individuals follow them
#     without knowing them
#   - no crowd, so "adaptable individuals" is still one stock
#
# What to expect (facets bench --t 60):
#   - Baseline: cohesion climbs from 20 to 54 by month 12, then swings
#     between 31 and 48 around the target of 40; the norms swing between
#     0.4 and 1 with it. The leader renews, the memory lags, the loop
#     overshoots. The individuals pile up capacity to 223 by month 60,
#     because the norms admit only part of their effort and the resources
#     keep coming. Ask: where does the energy the rules do not spend go?
#   - firmness 0.005 (gentle): settles at 31, no swing, norms steady at
#     0.5. Calm, and short of the goal.
#   - firmness 0.05 (heavy): peak 59, swings 32 to 55.
#   - norms last 3: a community that forgets its rules fast settles at 32
#     with the norms never above 0.66, however hard the leader renews.
#   - resources 6: the individuals run dry (4 by month 60), cohesion sinks
#     to 24, and the norms climb to 3.7: the leader renews rules nobody
#     has the capacity to follow. Governance without resources.
#   - upkeep 6: the individuals are spent to 6 by month 60 but cohesion
#     holds near the baseline until then. Depletion shows late.
#   - target 80: cohesion pins at 60, the ceiling (effort 10 x 6 months),
#     with the norms pinned near 5, fully open. Wanting more than the
#     people can give reaches the ceiling and no further.
#
# Knobs to try live: firmness, norms last, resources, upkeep, what
# healthy looks like. The renewal param is the leader's to write.
system "Theory of Change (v1)" : Concrete/Social

domain "a community: resources in, individuals and a leader inside, norms between them, cohesion out"

time unit month

environment Resources
    description "What the community lives on: food, money, attention, 12 units a month."
sink World
    description "Everyone outside who receives the community's wellbeing."
source Leadership
    description "The leader's effort to renew the norms; the agent writes its rate."

interface Intake
interface Results
interface Mandate
    description "Where the leader's authority enters: a renewal of the norms."
component Individuals primitive Buffering stock energy initial 50 release 10 maintenance 2
    description "The people's capacity: fed by resources, spent on practice, 2 a month to stay alive."
component Practice primitive Modulating backpressure
    description "What individuals do together; the norms set how much of their effort becomes shared practice."
component Cohesion primitive Buffering stock cohesion initial 20 time constant 6
    description "Social capital, declared as matter so it can be measured leaving."
component Norms primitive Buffering stock norms initial 0.5 time constant 12 informational
    description "The shared rules: a memory the leader renews and everyone forgets; its level governs practice."

flow Resources -> Intake : matter "resources" substance energy amount 12 unit "units/month"
flow Intake -> Individuals : matter "resources" substance energy
flow Individuals -> Practice : matter "effort" substance energy
flow Practice -> Cohesion : matter "shared practice" substance energy
flow Cohesion -> Results : matter "wellbeing" substance energy
flow Results -> World : matter "wellbeing" substance energy
flow Leadership -> Mandate : informational "renewal" amount 0.1 unit "norms/month"
flow Mandate -> Norms : informational "renewal"
flow Norms -> Practice : informational "rules"

param "renewal" : flow Leadership -> Mandate "renewal" range 0..1
agent Leader watches Cohesion rule proportional target 40 gain 0.02 manages param "renewal"
    description "Reads cohesion, renews the norms in proportion to the shortfall."

param "resources" : flow Resources -> Intake "resources" range 0..40
param "upkeep" : maintenance of Individuals range 0.5..10
param "norms last" : time constant of Norms range 1..36
param "what healthy looks like" : target of Leader range 5..80
param "firmness" : gain of Leader range 0.001..0.1

metric "wellbeing delivered" : sum into World

@lens mobus
