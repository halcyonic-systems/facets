component T1 primitive Buffering
component T2 primitive Splitting
interface I3
interface I4
environment E5
environment E6
component T7 primitive Buffering
flow E5 -> I3 : matter amount 10
flow I3 -> T2
flow T2 -> T1
flow T1 -> I4
flow I4 -> E6
flow T2 -> T7
flow T7 -> I4

@lens mobus
@system 480 320
@pos T1 488.96924 376.52295
@pos T2 420.6167 323.55127
@pos I3 274.7873 338.1582
@pos I4 660 320
@pos E5 24.246277 356.6367
@pos E6 862.5584 320
@pos T7 488.0039 259.6172
