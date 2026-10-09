# The bakery — the #463 move-5 words: a Combining oven that starves on its
# scarcest input (`limiting`) fed by a finite flour supply (`reservoir`).
system "Bakery" : Concrete/Technical
interface Door
interface Plug
interface Counter
component Oven primitive Combining limiting
source Flour reservoir 12
source Power
sink Shop
flow Flour -> Door : matter "flour" substance flour amount 5
flow Door -> Oven : matter "flour" substance flour
flow Power -> Plug : energy "heat" substance heat amount 3
flow Plug -> Oven : energy "heat" substance heat
flow Oven -> Counter : matter "bread" substance bread
flow Counter -> Shop : matter "bread" substance bread

@lens mobus
