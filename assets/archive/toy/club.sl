# Club membership: people join through a door the club's charter keeps
# partly closed, stay a while, and go back to the town they came from.
#
# Domain: sociology, membership of a voluntary association.
# Shape: one stock with a gated inlet, sitting inside a two-sided
# environment object (the town both sends and receives people).
#
# Town     is the surrounding community, an environment object with two
#          sides. It sends 20 would-be members a year, and it takes back
#          the members who leave, holding them as its level.
# Charter  is the admission rule set outside the club (say, by a national
#          body): a signal of 0.5, meaning half of those who apply get in.
# Door     is the admissions desk (Modulating). It passes applicants times
#          the charter's share. With backpressure, those it turns away are
#          held back in the town rather than vanishing.
# Club     is the membership (Buffering). Members stay 6 years on average
#          (time constant 6), so the club rests near 20 x 0.5 x 6 = 60.
#
# Knobs to try:
#   - the charter amount (0.5, between 0 and 1). At 1 the door is wide
#     open and the club heads for 120; at 0.25 it heads for 30.
#   - the club's time constant (6). Longer stays mean a bigger club.
system "Club" : Concrete/Social

domain "membership of a voluntary association"

time unit year

environment Town
    description "The surrounding community: sends applicants, takes back leavers."
source Charter
    description "The admission rule, set outside the club."

component Door primitive Modulating backpressure interface
    description "The admissions desk: lets in the charter's share of applicants."
component Club primitive Buffering stock people initial 10 time constant 6
    description "The members; each stays about 6 years."
interface Exit
    description "Members leaving the club."

flow Town -> Door : matter "applicants" substance people amount 20 unit "people/year"
flow Charter -> Door : informational "admission share" amount 0.5
flow Door -> Club : matter "admitted" substance people
flow Club -> Exit : matter "leavers" substance people
flow Exit -> Town : matter "leavers" substance people

param "applicants" : flow Town -> Door "applicants" range 0..60
param "admission share" : flow Charter -> Door "admission share" range 0..1
param "average stay" : time constant of Club range 1..20

metric "members who left" : sum into Town

@lens mobus
