# Drafted models with an empty or disguised milieu (facets#443)

Raw co-author exports, kept untouched, with one annotation record each. They are
the fixtures for the milieu work: measuring the drafter before and after it is
taught `milieu`, and testing the ambient-name lexicon and the kernel Warning.

## The labelling rule

Doctrine first: E = ⟨O, M⟩ (`docs/language/spec.md` §4, the lifecycle paper). An
object in O has a discrete point of contact, a flow across an interface. A milieu
variable in M bathes the system and has none; a `milieu` line takes no flow by
construction. So the test for an environment thing is not what it is called but
what the model does with it:

1. **The O/M test.** If the thing sends or receives something real and countable
   (photons, electrons, atoms, a collision's energy, waste heat) across the
   boundary, it is a `neighbour`, however ambient its name. If its only "flow" is
   the drafter's way of attaching a pervasive condition to the system (an
   informational "temperature reading" from `Ambient Air`, a `field` line from
   `Ambient Field` that nothing emits), or it has no flow at all, it is a
   `condition` drawn in disguise. The kernel Warning
   (`environment_thing_reads_as_condition`, Mobus only) applies the same test
   structurally: an ambient name with no matter or energy bond.
2. **What the prose presupposes.** A missing milieu line is charged only where the
   model's own text invokes a condition it never declares: "thermal equilibrium
   with its surroundings" presupposes a gas temperature; "over many collisions"
   presupposes a pressure or density; "the ambient gas of free electrons"
   presupposes a temperature and a density. Conditions the text does not invoke
   (an external magnetic field on an atom, say) are not charged: the fixture
   measures what the drafter failed to write, not what a physicist could add.
3. **No invented values.** A missing line is written without `value` unless the
   prose gives a number. A value is a snapshot the modeler asserts; the fixture
   does not assert one on the drafter's behalf.

`ambiguous` stays available for a thing the two tests leave undecided; neither
fixture here needs it.

## The two forms

- `disguised`: an ambient condition drawn as a `source` / `sink` / `environment`
  thing with an invented flow (the issue's headline case; interim examples live in
  the gitignored rig runs, `Ambient Air` in the thermostat drafts).
- `absent-milieu`: every environment thing is a real neighbour, but the
  conditions the prose presupposes are declared nowhere. Both exports here are
  this form. The two counts are recorded separately (`disguised_count`,
  `absent_count`) because the fix for each is different: the first needs the
  drafter to move a thing out of O, the second needs it to write M at all.

## Scoring a redraft

Redraft each description (`descriptions.json`) and compare with the record:

- **absent recall**: of the `missing[]` lines, how many does the redraft carry as
  a `milieu` whose name matches (head noun, case-folded)?
- **disguised rate**: environment things whose verdict is `condition` and which
  the redraft still draws as a thing with a flow.
- **over-steer**: environment things whose verdict is `neighbour` that the redraft
  turned into a `milieu` or dropped. Every neighbour here must survive with its
  flows; this is the built-in negative control, so no separate negative fixture
  is needed to catch the prompt pushing real neighbours into M.

Admission: the `.sl` must compile (`bert verdict --lens mobus <file>`), and the
annotation must name every environment thing the file declares.
