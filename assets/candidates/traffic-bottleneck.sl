# ── A queue before a bottleneck: the kink at one ────────────────────────────
#
# Cars arrive at a lane drop and are served at most 10 a minute. While the
# arrival rate stays under the service rate the queue stays at about one
# minute's arrivals and goes nowhere; the moment arrivals pass the service
# rate the queue grows without bound, by exactly the surplus every minute. The
# run starts at 8 a minute (ratio 0.8); turning the arrivals up to 12 at
# minute 6 (ratio 1.2) is the whole lesson. This is a fluid queue, so the
# growth is a straight line, not an explosion; what changes at ratio one is
# that the queue never comes back.
#
# Split form: the on-ramp and the far side of the bottleneck are the
# pass-ways; the queue and the bottleneck are residents. The numbers are
# round so the ledger reads by eye; nothing here is a claim about any road.
system "Traffic Bottleneck" : Concrete/Technical

domain "a queue of cars before a lane drop that serves 10 a minute"

time unit minute

level Structure

interface Ramp
    description "Where cars come in: the on-ramp feeding the queue."
interface Beyond
    description "Where cars go out: the open road past the bottleneck."

component Queue primitive Buffering stock cars release 10
    description "Cars waiting; at most 10 a minute are let through."
component Bottleneck primitive Modulating
    description "The lane drop; it passes the cars the queue releases."

source Traffic
sink Road

flow Traffic -> Ramp : matter "arrivals" substance cars amount 8 unit "cars/min"
flow Ramp -> Queue : matter "joining" substance cars
flow Queue -> Bottleneck : matter "served" substance cars
flow Bottleneck -> Beyond : matter "passing" substance cars
flow Beyond -> Road : matter "passed" substance cars

param "arrivals" : flow Traffic -> Ramp "arrivals" range 0..20
param "service" : release of Queue range 1..20

metric "cars through" : sum into Road

@lens mobus
