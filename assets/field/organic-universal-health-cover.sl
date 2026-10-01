# field · with Luke · 2026-10-01
# Drawn on a call, off the shelf, as a first pass at a decentralised
# universal-coverage design. Shipped here so the person it was drawn with
# can open it and keep exploring. Not a kernel witness; see README.md.
system "Organic Universal Health Cover" : Concrete/Social
domain "healthcare financing and delivery — a decentralised universal-coverage prototype"
component "Enrollment Gateway" primitive Copying interface
    description "Turns a civil record of birth, naturalisation or residency into a standing membership. Nobody applies and no committee approves: coverage begins when a person exists on the register and lapses only at death."
component "Contribution Collector" primitive Splitting interface
    description "Takes an income-proportional contribution and splits it two ways by a fixed published rule: the larger share to the risk pool the member chose, the remainder into that member's own health account."
component "Mutual Risk Pools" interface
    description "Several member-owned pools competing for members on terms and service rather than on who they will accept. Open this to model underwriting rules, the member ballot, reserves, and the rule that a pool may never refuse an enrolled resident."
component "Catastrophic Reinsurance Pool" primitive Buffering
    description "A pool of the pools. Each cedes a premium and draws on it for claims above a threshold, so a small pool is not destroyed by one costly year and need not screen its members."
component "Personal Health Accounts" primitive Buffering interface
    description "The member's own balance for routine and elective care, spent at posted prices. It is the price-sensitive half of the system; the pools carry the unpredictable half."
component "Care Providers" interface
    description "Independent clinics, hospitals, pharmacies and practices. Open this to model staffing, theatres, inventory, scheduling and the internal referral chains."
component "Outcome Auditors" primitive Sensing
    description "Independent raters who follow up treated patients and verify what a provider reported. They measure; they do not approve or licence anything."
component "Price and Outcome Registry" primitive Copying interface
    description "Publishes every provider's posted price and audited result in one open feed. This is the whole steering mechanism: members and pools move, and providers feel it, without anyone issuing an instruction."
component "Innovation Royalty Pool" interface
    description "Pays a therapy's originator a royalty scaled to the audited outcome gain it produced in the field, funded by a small levy on the pools. Open this to model the royalty formula, its decay with age, and the dispute path."
source "Vital Records Office"
    description "The civil registrar — births, naturalisations, residency and deaths."
source Employers
source "Medical Supply Manufacturers"
source "Health Professions Schools"
source "Power Grid"
environment Households
    description "The member population: they contribute, choose a pool, arrive as patients, and read the registry."
environment "Medical Innovators"
    description "Drug, device and procedure developers outside the boundary: they supply new therapies and receive royalties."
sink "Regional Waste Handler"
sink Atmosphere
flow "Vital Records Office" -> "Enrollment Gateway" : informational "birth & residency records"
    description "The trigger for automatic lifetime enrollment — universality comes from the register, not from an application process."
flow "Enrollment Gateway" -> "Mutual Risk Pools" : informational "enrollment record"
flow "Enrollment Gateway" -> "Contribution Collector" : informational "member roster"
flow Employers -> "Contribution Collector" : matter "payroll contributions"
flow Households -> "Contribution Collector" : matter "income contributions"
    description "A flat fraction of income, the same rule for everyone, with no condition attached to health status."
flow "Contribution Collector" -> "Mutual Risk Pools" : matter "pooled premiums"
flow "Contribution Collector" -> "Personal Health Accounts" : matter "routine care share"
flow Households -> "Mutual Risk Pools" : informational "pool choice"
    description "A member may move to another pool at any time; this exit, not an oversight body, is what disciplines a pool."
flow "Mutual Risk Pools" -> Households : informational "coverage terms"
flow "Mutual Risk Pools" -> "Catastrophic Reinsurance Pool" : matter "cession premiums"
flow "Catastrophic Reinsurance Pool" -> "Mutual Risk Pools" : matter "tail claim cover"
flow "Mutual Risk Pools" -> "Care Providers" : matter "claim payments"
flow Households -> "Personal Health Accounts" : matter "top-up deposits"
flow "Personal Health Accounts" -> "Care Providers" : matter "direct payments"
    description "Routine care is bought by the patient at a posted price, so the price is felt by the person choosing."
flow Households -> "Care Providers" : matter "patients"
flow "Care Providers" -> Households : matter "treated patients"
    description "The product: care delivered and a person returned to their household, together with the advice and medication that go with them."
flow "Medical Supply Manufacturers" -> "Care Providers" : matter "drugs and devices"
flow "Health Professions Schools" -> "Care Providers" : matter "newly trained clinicians"
flow "Power Grid" -> "Care Providers" : energy "electricity"
flow "Care Providers" -> "Outcome Auditors" : informational "prices and outcomes"
flow "Outcome Auditors" -> "Price and Outcome Registry" : informational "verified results"
flow "Price and Outcome Registry" -> Households : informational "published prices"
flow "Price and Outcome Registry" -> "Mutual Risk Pools" : informational "provider results"
flow "Price and Outcome Registry" -> "Innovation Royalty Pool" : informational "measured outcome gains"
flow "Mutual Risk Pools" -> "Innovation Royalty Pool" : matter "royalty levy"
flow "Innovation Royalty Pool" -> "Medical Innovators" : matter "outcome royalties"
    description "The innovation incentive: payment follows demonstrated benefit in the field rather than list price or volume sold."
flow "Medical Innovators" -> "Care Providers" : matter "new therapies"
flow "Care Providers" -> "Regional Waste Handler" : matter "clinical waste"
flow "Care Providers" -> Atmosphere : energy "waste heat"

@lens mobus
@pos "Enrollment Gateway" 480 23.599335
@pos "Contribution Collector" 289.47736 92.94388
@pos "Mutual Risk Pools" 771.8977 268.53058
@pos "Catastrophic Reinsurance Pool" 852.3838 167.39262
@pos "Personal Health Accounts" 188.10233 268.5305
@pos "Care Providers" 223.30951 468.20035
@pos "Outcome Auditors" 366.8492 613.5592
@pos "Price and Outcome Registry" 736.6905 468.20032
@pos "Innovation Royalty Pool" 581.375 598.5255
@pos "Vital Records Office" 205.12842 -156.09167
@pos Employers 58.872284 -33.368256
@pos "Medical Supply Manufacturers" -69.743286 319.99994
@pos "Health Professions Schools" -36.58972 508.02332
@pos "Power Grid" 58.872223 673.36816
@pos Households -36.58972 131.97672
@pos "Medical Innovators" 205.12833 796.0917
@pos "Regional Waste Handler" 1011.0112 462.28406
@pos Atmosphere 868.7272 708.72723
