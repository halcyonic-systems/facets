# ── Two tanks in series: the second one lags the first ──────────────────────
# bench · after Sterman 2000, bathtub dynamics (the stock-and-flow first lesson)
#
# A tap fills the upper tank; the upper tank drains through a valve into the
# lower tank; the lower tank drains to the sewer. Each tank empties at its
# level over its own time constant (upper 4 minutes, lower 6), so each is a
# first-order lag and the pair is a second-order one. Double the tap at
# minute 6 (both tanks start at rest, at 40 and 60 L) and watch the upper tank
# climb toward its new 80 L first and the lower tank toward 120 L late, with no
# overshoot: the lag is the lesson.
#
# Split form: the tap and the sewer outlet are the pass-ways; the tanks and
# the valve are residents. The valve is open, so the upper tank's time
# constant is the valve: a smaller number is a wider valve. The numbers are
# round so the ledger reads by eye; nothing here is a claim about plumbing.
system "Two Tanks" : Concrete/Technical

domain "a tank draining into a tank: two first-order lags in series"

time unit minute

level Structure

interface Tap
    description "Where water comes in: the filler tap over the upper tank."
interface Outlet
    description "Where water goes out: the lower tank's drain pipe."

component "Upper Tank" primitive Buffering stock L initial 40 time constant 4
    description "Fills from the tap; empties through the valve at its level over 4 minutes."
component Valve primitive Modulating
    description "An open valve joining the tanks; it passes what the upper tank gives."
component "Lower Tank" primitive Buffering stock L initial 60 time constant 6
    description "Fills through the valve; empties to the sewer at its level over 6 minutes."

source Mains
sink Sewer

flow Mains -> Tap : matter "water" substance water amount 10 unit "L/min"
flow Tap -> "Upper Tank" : matter "fill" substance water
flow "Upper Tank" -> Valve : matter "feed" substance water
flow Valve -> "Lower Tank" : matter "transfer" substance water
flow "Lower Tank" -> Outlet : matter "drain" substance water
flow Outlet -> Sewer : matter "drain" substance water

param "tap" : flow Mains -> Tap "water" range 0..40
param "valve time" : time constant of "Upper Tank" range 1..20
param "drain time" : time constant of "Lower Tank" range 1..20

metric "drained" : sum into Sewer

@lens mobus
