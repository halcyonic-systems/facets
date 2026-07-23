# corpus-entry: v1
# title: Criminal courts and probation, New York State
# author: George Klir
# work: Facets of Systems Science, 2nd ed.
# year: 2001
# locus: Ch. 4, book pp. 77–78
# figure: Fig. 4.7
# teaches: A structure system in Klir's own sense: five elements, ten directed variables, and a feedback edge, over an institutional domain rather than a physical one. Each variable is an output of exactly one element — Klir's own legality rule for structure systems, checkable against this model.
# omits: The behaviour of any element. Klir says these are "initially source systems, which later become data systems", so nothing here says what any block does with its inputs — only which variables connect which elements.
# note: The support of this system is TIME — observations made monthly, weekly or daily from a fixed date. Every variable below is a count per observation period, not a stock. SL carries no support, so that fact lives only in this header.
# note: Direction is asserted on all ten relations, and that is Klir's own commitment here: he defines each variable as an input to one element and an output of another. Contrast the students-in-a-course entry, where the relation is a symmetric equivalence and direction is deliberately absent.
# note: No kind of flow is declared. Klir's framework is substance-blind by construction, and cases are neither matter nor energy nor message; guessing a kind would add a commitment he does not make.
# note: Klir draws the environment as its own block OUTSIDE a dashed boundary labelled SYSTEM S, indexed x = 0 — the same environment-en-bloc convention Bunge uses in Definition 1.2, arrived at independently. Neither cites the other for it.
# note: The fifth element, EXIT, is Klir's; the PDF-to-markdown conversion of Fig. 4.7 preserved only four block labels while the text says five. It was recovered by reading the figure in the source PDF, not inferred from the variable list.

system "Criminal Courts and Probation, New York State"

component COMPLAINT
component "TRIAL PHASE"
component SENTENCING
component PROBATION
component EXIT

environment "ENVIRONMENT OF S"

flow "ENVIRONMENT OF S" -> COMPLAINT "v1 — complaints received by the criminal court"
flow COMPLAINT -> "TRIAL PHASE" "v2 — complaints carried toward the arraignment"
flow COMPLAINT -> EXIT "v3 — complaints dismissed"
flow "TRIAL PHASE" -> SENTENCING "v4 — cases held over for sentencing"
flow "TRIAL PHASE" -> EXIT "v5 — cases acquitted or discharged"
flow SENTENCING -> PROBATION "v6 — cases assigned for probation"
flow SENTENCING -> EXIT "v7 — cases not assigned to probation"
flow PROBATION -> SENTENCING "v8 — cases that violate the conditions of probation"
flow PROBATION -> EXIT "v9 — cases discharged from probation"
flow EXIT -> "ENVIRONMENT OF S" "v10 — cases discharged from the criminal court institutions"

@lens klir
@directed 1
@directed 2
@directed 3
@directed 4
@directed 5
@directed 6
@directed 7
@directed 8
@directed 9
@directed 10
