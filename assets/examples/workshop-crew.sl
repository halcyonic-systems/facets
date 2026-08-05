# ── A Bunge-native entry: a CES triple with bonds AND mere relations ─
# Bunge's lens asks for the triple (Treatise Vol. 4, Ch. 1 §1.2):
# Composition (the crew), Environment (firm and customer), Structure —
# and structure decomposes into the bondage B and the nonbonding
# relations B̄ (§1.2: "the total set of relations ... may be decomposed
# into its bondage and the set of nonbonding relations"). A bond makes
# a difference to the relata; a nonbonding relation does not — his own
# social example is belonging to the same occupational group (Vol. 4,
# Ch. 5). The `mere` relations below are that B̄, stated as content.
#
# No component carries a work-process primitive: Bunge has no process
# taxonomy, and leaving Mobus's question unanswered is part of what
# this entry tests. The `interface` on Foreman is a concession to
# Mobus's membrane (every crossing flow needs an interface) — kept by
# decision 2026-08-05, not a Bunge commitment: a refused model has
# blind = undefined, and the entry exists to measure what an
# *accepting* Mobus cannot see.

system "Workshop Crew" : Concrete/Social
domain "A three-person fabrication crew inside a firm: who is bonded to whom, and which relations make no difference"

component Foreman interface
component Welder
component Apprentice

source Firm
sink Customer

# The bondage B — connections that make a difference to the relata.
flow Firm -> Foreman : informational "work orders"
flow Foreman -> Welder : informational "task assignment"
flow Welder -> Foreman : matter "finished piece"
flow Welder -> Apprentice : informational "instruction"
flow Apprentice -> Welder : matter "assistance"
flow Foreman -> Customer : matter "delivered work"

# The nonbonding relations B̄ — real, declared, and making no
# difference to behavior. Bunge insists these are part of the
# structure; Mobus never projects them.
flow Welder -> Apprentice "same trade" mere
flow Foreman -> Welder "same shift roster" mere

@lens bunge
