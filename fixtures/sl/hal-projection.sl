# The hal stack (the sovereign AI infrastructure) as a bounded system — the
# model sketched in docs/design/sl2-authoring-language.md §2.3, authored for
# real as the third corpus entry.
system "hal stack" : Concrete/Technical
domain "sovereign AI infrastructure"
component Proxy interface
component DailyLoop interface
component Council
source Operator
sink UpstreamAPIs
flow Council -> Proxy : informational "convene models"
flow Proxy -> DailyLoop : informational "tool calls"
flow Operator -> DailyLoop : informational "requests"
flow Proxy -> UpstreamAPIs : informational "model requests"
boundary porosity 0.15 fuzziness 0.05

@lens bunge
