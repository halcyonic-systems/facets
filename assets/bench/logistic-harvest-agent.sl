# ── A fishery with a closed season ──────────────────────────────────────────
# bench · after the logistic fishery with a closed season — Gordon–Schaefer; Mobus 2022 §12.2.3.1
#
# The same fish stock as logistic-harvest.sl, fished hard (a two-day catch
# time, which in the control collapses the stock to a yield of 0.02 t/day),
# with one decision in it: a quota agent watches the stock and closes the
# fishery at or below a level, reopening it above. The stock recovers each
# time the boats stay in, and the landed total over eighty days is several
# times the control's. The level is the knob a fisheries council argues
# about.
system "Logistic Harvest (quota)" : Concrete/Biological

domain "a fish stock that grows toward a ceiling while being fished, with a closed season"

time unit day

level Structure

interface Feeder
    description "Where the water's productivity comes in."
interface Landing
    description "Where the catch comes ashore."

component Fish primitive Buffering stock t initial 0.2 time constant 2
    description "The stock; fished at half of it per day when the fishery is open."
component Breeding primitive Modulating backpressure
    description "Growth: productivity becomes biomass in proportion to the stock."
component Crowding primitive Modulating
    description "The ceiling: growth falls as the stock crowds its water."
component Count primitive Sensing gain 0.5
    description "Reads the stock for breeding and crowding."
component Headroom primitive Inverting setpoint 1
    description "How far the stock is below its ceiling."
agent Quota watches Fish rule threshold above 0.3 emit 1 else 0 manages Fish
    description "Watches the stock; the fishery is open at or above the level, closed below it."

source Feed
sink Market

flow Feed -> Feeder : matter "feed" substance biomass amount 1 unit "t/day"
flow Feeder -> Breeding : matter "feed" substance biomass
flow Breeding -> Crowding : matter "growth" substance biomass
flow Crowding -> Fish : matter "recruits" substance biomass
flow Fish -> Landing : matter "catch" substance biomass
flow Landing -> Market : matter "landed" substance biomass
flow Fish -> Count : informational "stock level"
flow Count -> Breeding : informational "breeders"
flow Count -> Headroom : informational "crowd"
flow Headroom -> Crowding : informational "room"
param "catch time" : time constant of Fish range 1..10
param "closes below" : above of Quota range 0.05..0.6

metric "landed" : sum into Market

@lens mobus
