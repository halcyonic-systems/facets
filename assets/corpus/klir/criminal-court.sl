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
# note: The ten flows carry `informational`, and that kind is THIS MODEL'S reading rather than Klir's. Klir types nothing — his framework is substance-blind by construction — but his own variable definitions fix what moves: every one of the ten is a count of case records passing between institutions ("V1, The total number of complaints received by the criminal court", "V4, The number of cases that are held over for sentencing"). A complaint and a case are records, not matter and not energy, so `informational` is the only one of the four kinds that can be said at all. An earlier revision left all ten undeclared and said guessing would add a commitment Klir does not make; the counter-argument that won is that undeclared is not neutral downstream — projection reads an unspecified kind as Energy, so the file was already carrying a commitment, just an unauthored one.
# note: Nothing here is decomposed, and Klir is the reason. He gives no interior for any of the five blocks: "Elements of the system are initially source systems, which later become data systems" (p. 78), and a source system in his hierarchy is a variable set with no interior whatsoever. Typing the ten flows makes all five phases seam-ready on the parent side — a child model could now be checked against their crossings — but the corpus does not invent the child that would go there.
# note: Klir draws the environment as its own block OUTSIDE a dashed boundary labelled SYSTEM S, indexed x = 0 — the same environment-en-bloc convention Bunge uses in Definition 1.2, arrived at independently. Neither cites the other for it.
# note: The fifth element, EXIT, is Klir's; the PDF-to-markdown conversion of Fig. 4.7 preserved only four block labels while the text says five. It was recovered by reading the figure in the source PDF, not inferred from the variable list.

system "Criminal Courts and Probation, New York State"
level Structure

component COMPLAINT
component "TRIAL PHASE"
component SENTENCING
component PROBATION
component EXIT

environment "ENVIRONMENT OF S"

flow "ENVIRONMENT OF S" -> COMPLAINT : informational "v1 — complaints received by the criminal court"
flow COMPLAINT -> "TRIAL PHASE" : informational "v2 — complaints carried toward the arraignment"
flow COMPLAINT -> EXIT : informational "v3 — complaints dismissed"
flow "TRIAL PHASE" -> SENTENCING : informational "v4 — cases held over for sentencing"
flow "TRIAL PHASE" -> EXIT : informational "v5 — cases acquitted or discharged"
flow SENTENCING -> PROBATION : informational "v6 — cases assigned for probation"
flow SENTENCING -> EXIT : informational "v7 — cases not assigned to probation"
flow PROBATION -> SENTENCING : informational "v8 — cases that violate the conditions of probation"
flow PROBATION -> EXIT : informational "v9 — cases discharged from probation"
flow EXIT -> "ENVIRONMENT OF S" : informational "v10 — cases discharged from the criminal court institutions"

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
