# Shelf fidelity audit — 2026-10-09

**Status: LIVE** — the measured input to [#472](https://github.com/halcyonic-systems/facets/issues/472); re-measure after each conversion lands.

Input to #472. Every shipped example and the field model, measured against the standard the newest models set (`rain-barrel-garden`, `translation-apparatus`): verdict under Mobus; merged stamps vs pass-ways (the #471 census); declared amounts on drivers (flows out of a source); `param` lines with ranges; a `metric`; descriptions; canonical form; whether it runs conserved from `bert bench`. Numbers are from the CLI on main at ae69dfa. The corpus is not audited here: its admission test is citation, not this standard.

| model | errors | warnings | merged → pass-ways | drivers w/ amount | params w/ range | metrics | descriptions | canonical | runs |
|---|---|---|---|---|---|---|---|---|---|
| bitcoin.sl | 0 | flow_not_consumed×2, interface_does_work×3 | 3 → 0 | 0/3 | 0/0 | 0 | 8 | yes | no:bert: assets/examples/bitcoin.sl: run refused: the wiring co |
| federal-reserve.sl | 0 | interface_does_work×2 | 3 → 0 | 0/6 | 0/0 | 0 | 13 | yes | conserved True |
| hal-harness.sl | 0 | flow_not_consumed×8, interface_does_work | 3 → 0 | 0/3 | 0/0 | 0 | 2 | yes | no:bert: assets/examples/hal-harness.sl: model is not executabl |
| jung-functions.sl | 0 | interface_does_work | 3 → 0 | 0/2 | 0/0 | 0 | 0 | yes | conserved False |
| llm-market.sl | 0 | interface_does_work×9 | 11 → 0 | 2/11 | 2/4 | 12 | 0 | yes | conserved True |
| predator-prey.sl | 0 | interface_does_work×2 | 2 → 0 | 0/2 | 0/0 | 0 | 0 | yes | conserved True |
| rain-barrel-garden.sl | 0 | — | 0 → 3 | 2/2 | 3/3 | 1 | 5 | yes | conserved True |
| ribosome-centers.sl | 0 | interface_does_work×2 | 4 → 0 | 0/4 | 0/0 | 0 | 0 | yes | conserved True |
| translation-apparatus.sl | 0 | — | 0 → 4 | 4/4 | 4/4 | 1 | 30 | yes | conserved True |
| organic-universal-health-cover.sl | 0 | flow_not_consumed×2, interface_does_work×3 | 7 → 0 | 0/10 | 0/0 | 0 | 18 | yes | no:bert: assets/field/organic-universal-health-cover.sl: model  |

## Reading it

- **Two models meet the standard**: `rain-barrel-garden` and `translation-apparatus` — split form, every driver declared, params ranged, a metric, descriptions, run conserved.
- **Seven carry the merged-stamp habit** (`interface_does_work` fires on all seven; 20 components in all). Conversion proposals are drafted as separate PRs, one per model, each with a before/after bench where the model runs.
- **Structural examples have no numbers by design** (`bitcoin`, `hal-harness`, `jung-functions`, `ribosome-centers`, `federal-reserve` drivers 0/n). The standard does not ask to invent them: a number is a claim. They stay structural unless a source supplies magnitudes; the conversion PRs add no amounts. Shingai's read (2026-10-10): for most of these a brief conversation would supply common-sense round inputs and outputs — illustrative, labelled as such in the header the way the rain barrel is — and that is a cheap pass worth doing, just not in the conversion PRs. The rule stays: a number on the shelf is either sourced or declared a toy, never silently invented.
- **`jung-functions` runs but does not conserve** — a structural model with no declared amounts stepping on defaults; `hal-harness` and `bitcoin` refuse to run (wiring / executability reasons quoted by the CLI). None of the three is on the shelf for dynamics; the fidelity question for them is structure and descriptions only. Shingai's read: only energy is conserved there, not information, so "does not conserve" may be the ledger reading the informational flows; to check whether the residual sits on the energy chain or the message flows before calling it a defect.
- **Descriptions** are thin on `jung-functions`, `predator-prey`, `ribosome-centers`, `llm-market` (0 on things). Writing them is prose in Shingai's voice, not a mechanical pass; listed as his.
- **`hal-harness`**: his read — mostly for him. Moved to the field shelf 2026-10-10 (`assets/field/`, `with Shingai`), the existing door for a model drawn with and for one person.
- **The field model** (`organic-universal-health-cover`): 7 merged stamps, no numbers, refuses to run; governed by the field README's admission test (provenance), so conversion is offered, not assumed.

## What the fidelity pass is, then

1. Accept or amend the seven conversion PRs (structure only; nothing invented).
2. Descriptions where they are missing — his words.
3. Decide `hal-harness`: private shelf or stays.
4. Admit candidates from `assets/candidates/` (staged on `shelf/candidates`) to lift the shelf's dynamics count.
5. Then publish (decision B's held half).
