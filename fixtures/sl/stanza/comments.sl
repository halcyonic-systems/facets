# Stanza test — comment/blank preservation (#302 prong 2)
system "Stanza Test" : Concrete/Technical

# the primary process
component Furnace primitive Combining  # runs hot
    description "Where the heat happens"  # trailing on continuation

source Ore

flow Ore -> Furnace : matter "ore feed"  # feeding it


boundary porosity 0.5 fuzziness 0.2

@lens mobus
@wibble unknown annotation survives
# trailing note after everything
