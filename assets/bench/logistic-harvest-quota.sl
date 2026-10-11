# ── A fishery with a closed season set by decree ────────────────────────────
# bench · after the logistic fishery with a closed season — Gordon–Schaefer; Mobus 2022 §12.2.3.2
#
# The same fish stock as logistic-harvest.sl, fished hard (a two-day catch
# time), with the quota agent of logistic-harvest-agent.sl in its other
# form. There the agent gates the stock's release each tick, a signal; here
# it writes a declared share each tick, a command (ADR 0008 D1). The stock
# releases a tenth of itself a day either way; what the agent decides is
# how much of that is landed and how much goes back. In a closed season the
# boats still bring the catch up and put every fish back, catch and release,
# so the split is a real two-way split the engine reads, not a gate.
#
# The command lands at the end of the tick it was decided in and governs
# the next, so this fishery opens and closes one day later than the signal
# form; the sawtooths differ in phase, and any stretch where the decision
# does not change traces the signal form exactly from an equal stock. The
# numbers are round so the ledger reads by eye; nothing here is a claim
# about any fishery.
system "Logistic Harvest (quota, command)" : Concrete/Biological

domain "a fish stock that grows toward a ceiling while being fished, with a closed season set by decree"

time unit day

level Structure

interface Feeder
    description "Where the water's productivity comes in."
interface Landing
    description "Where the catch comes ashore."

component Fish primitive Buffering stock t initial 0.2 time constant 2
    description "The stock; a tenth of it is brought up each day, landed or returned."
component Breeding primitive Modulating backpressure
    description "Growth: productivity becomes biomass in proportion to the stock."
component Crowding primitive Modulating
    description "The ceiling: growth falls as the stock crowds its water."
component Count primitive Sensing gain 0.5
    description "Reads the stock for breeding and crowding."
component Headroom primitive Inverting setpoint 1
    description "How far the stock is below its ceiling."
component Return primitive Combining
    description "Catch and release: in a closed season every fish brought up goes back."

source Feed
sink Market

flow Feed -> Feeder : matter "feed" substance biomass amount 1 unit "t/day"
flow Feeder -> Breeding : matter "feed" substance biomass
flow Breeding -> Crowding : matter "growth" substance biomass
flow Crowding -> Fish : matter "recruits" substance biomass
flow Fish -> Landing : matter "landed" substance biomass amount 0
flow Fish -> Return : matter "released" substance biomass amount 1
flow Return -> Fish : matter "returned" substance biomass
flow Landing -> Market : matter "landed" substance biomass
flow Fish -> Count : informational "stock level"
flow Count -> Breeding : informational "breeders"
flow Count -> Headroom : informational "crowd"
flow Headroom -> Crowding : informational "room"
param "catch time" : time constant of Fish range 1..10
param shares "landed share" : from Fish
agent Quota watches Fish rule threshold above 0.3 emit 1 else 0 manages param "landed share"
    description "Watches the stock; sets the landed share to all at or above the level and to none below it, from the next day."
param "closes below" : above of Quota range 0.05..0.6

metric "landed" : sum into Market

@lens mobus
