# Mobus's Process M (Ch.4 §4.3.1) — the book's own system paragraph, in SL:
# "Process M takes in materials A and B from sources 1 and 2 along with energy E
#  from source 3 to make product Z with waste product X going to sinks 5 and 6."
# With #84 the SOI is named at system level; the lone component is its combining
# work process.
system "Process M" : Concrete
component Work primitive Combining interface
source "Source 1"
source "Source 2"
source "Source 3"
sink "Sink 5"
sink "Sink 6"
flow "Source 1" -> Work : matter "material A"
flow "Source 2" -> Work : matter "material B"
flow "Source 3" -> Work : energy "energy E"
flow Work -> "Sink 5" : matter "product Z"
flow Work -> "Sink 6" : matter "waste X"

@lens mobus
