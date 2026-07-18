# Mobus's Process M (Ch.4 §4.3.1) — the book's own system paragraph, in SL:
# "Process M takes in materials A and B from sources 1 and 2 along with energy E
#  from source 3 to make product Z with waste product X going to sinks 5 and 6."
system : Concrete
component "Process M" primitive Combining interface
source "Source 1"
source "Source 2"
source "Source 3"
sink "Sink 5"
sink "Sink 6"
flow "Source 1" -> "Process M" : matter "material A"
flow "Source 2" -> "Process M" : matter "material B"
flow "Source 3" -> "Process M" : energy "energy E"
flow "Process M" -> "Sink 5" : matter "product Z"
flow "Process M" -> "Sink 6" : matter "waste X"

@lens mobus
