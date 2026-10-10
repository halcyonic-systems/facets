# A shared door (#493): one pass-way that honestly serves two residents.
# Water comes in through one inlet and is split to two tanks; both drain
# to the same outlet. Neither the inlet nor the outlet does work.
system "Two Tanks, One Door" : Concrete/Physical
interface Inlet
interface Outlet
component "Tank A" primitive Buffering stock L initial 10 release 2
component "Tank B" primitive Buffering stock L initial 10 release 3
source Main
sink Drain
flow Main -> Inlet : matter "supply a" substance water amount 4
flow Main -> Inlet : matter "supply b" substance water amount 6
flow Inlet -> "Tank A" : matter "fill a" substance water amount 4
flow Inlet -> "Tank B" : matter "fill b" substance water amount 6
flow "Tank A" -> Outlet : matter "drain a" substance water
flow "Tank B" -> Outlet : matter "drain b" substance water
flow Outlet -> Drain : matter "drained" substance water

@lens mobus
