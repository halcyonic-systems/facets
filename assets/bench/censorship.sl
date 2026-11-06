# ── A public that hears what a regime lets through ──────────────────────────
# bench · a gate on messages (#587) — Mobus 2022 §11.2.1.1, Fig 3.18
#
# Ten messages a day are said. A gate passes the share the regime allows,
# and what gets through is added to what the public has heard, a memory
# that fades over ten days. The regime watches that memory and, once it
# passes a line, cuts the gate to a fifth; under the line it opens it
# again. Uncut, the public's memory rests at 100 (10 a day times 10
# days); with the regime at 40 it saws around 40. Messages copy and are
# not conserved, so nothing the gate stops is held anywhere: it ceases.
# The line and the fraction are the two knobs.
system "Censorship" : Concrete/Social

domain "a public that hears what a regime lets through"

time unit day

source Voices
    description "What people say: ten messages a day."

interface Press
    description "Where what is said enters circulation."

component Gate primitive Modulating
    description "The censor's office: passes the share of messages the regime allows."
component Heard primitive Buffering stock messages initial 0 time constant 10 informational
    description "What the public has heard and still remembers; fades over ten days."

agent Regime watches Heard rule threshold above 40 emit 0.2 else 1 manages Gate
    description "Lets everything through while the public knows little; cuts to a fifth once what is heard passes the line."

flow Voices -> Press : informational "messages" amount 10 unit "messages/day"
flow Press -> Gate : informational "messages"
flow Gate -> Heard : informational "allowed"

param "voices" : flow Voices -> Press "messages" range 0..50
param "the line" : above of Regime range 5..100
param "memory" : time constant of Heard range 1..30

@lens mobus
