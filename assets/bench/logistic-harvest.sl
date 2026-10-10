# ── Logistic growth with a harvest: the cliff past maximum sustainable yield ─
# bench · after Schaefer 1954 (surplus-production fishery; maximum sustainable yield)
#
# One fish stock that breeds fastest at middling numbers and is fished in
# proportion to its size. Growth is feed x (breeders) x (room): the Count gauge
# reads the stock (its gain is 0.5), one valve opens with the breeders, and a
# second opens with the room the Headroom comparator reports (setpoint 1, so
# room = 1 - breeders). That makes growth 0.5 N (1 - N/2): a growth rate of
# 0.5 a day and a ceiling of 2 tonnes. Fishing takes N / catch time. At a
# catch time of 4 days the yield peaks at 0.25 t/day with the stock at 1 t;
# fish harder than a 2-day catch time and the stock collapses to zero.
#
# Split form: the feeder and the landing are the pass-ways; the stock, the
# valves, the gauge and the comparator are residents. The ceiling is a
# comparator, not a finite source: a reservoir would run out, and this
# environment regrows. The numbers are round so the ledger reads by eye;
# nothing here is a claim about any fishery.
system "Logistic Harvest" : Concrete/Biological

domain "a fish stock that grows toward a ceiling while being fished"

time unit day

level Structure

interface Feeder
    description "Where feed comes in: the plankton and prey the stock lives on."
interface Landing
    description "Where the catch goes out: the boats and the quay."

component Fish primitive Buffering stock t initial 0.2 time constant 4
    description "The stock; fished at its size over the catch time."
component Breeding primitive Modulating backpressure
    description "Admits feed in proportion to the breeders, so no breeders means no growth."
component Crowding primitive Modulating
    description "Admits recruits in proportion to the room left under the ceiling."
component Count primitive Sensing
    description "Reads the stock level without removing fish; its gain is half."
component Headroom primitive Inverting setpoint 1
    description "Reports the room left: one minus the crowding."

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

metric "landed" : sum into Market

@lens mobus
