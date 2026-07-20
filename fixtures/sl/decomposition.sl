# Decomposition by reference (bert-lenses#89 step 4): a component carries a
# child model that realizes it — a human label ("furnace-interior") plus a
# stamped base58 id (the key). The reference round-trips through SL digit for
# digit; the label may drift harmlessly, the id never does.
system "Refinery" : Concrete/Technical
component Furnace primitive Combining decomposes "furnace-interior" @Hrs6K91KnZZsiPcWzftv8U
source "Crude Supply"
sink "Product Line"
flow "Crude Supply" -> Furnace : matter "crude"
flow Furnace -> "Product Line" : matter "refined"

@lens mobus
