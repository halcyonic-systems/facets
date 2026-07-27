#!/usr/bin/env python3
"""Prove the gates can fail (#216, extending SSF #35 to existing checks).

A check that nothing can fail proves nothing — `check_bond`'s extra conjunct sat
invisible for a year because no fixture could trip it, and the demo round-trip
test passed through a 22% trajectory change because its assertion was too weak
to see it. This harness applies each declared mutation — a small, named
reintroduction of a real defect — and asserts the named gate goes RED, then
restores the tree and asserts green.

Run: python3 scripts/mutation_check.py            (all mutations)
     python3 scripts/mutation_check.py <name>     (one, by name)

Add a mutation whenever a gate ships: the entry is the standing record of what
the gate is FOR, in the form of the defect it must catch.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (name, patches, test args, what-this-reintroduces)
# patches: [(file, present-code, mutated-code), ...] — all applied together, so
# a defect spanning sibling assets (e.g. BOTH two-thing twins undirected) is
# reproducible as it actually shipped.
MUTATIONS = [
    # OWED, blocked on the engine honoring Δt: a mutation reverting flux to
    # per-tick consumption must turn dt_invariance.rs red. It cannot be added
    # while that gate is BORN red (mutation coverage presupposes a green gate —
    # against a red one, every mutation passes vacuously). Add it in the same
    # commit that makes the engine scale flux by Δt.
    (
        "amount-hardcode",
        [("crates/bert-canvas/src/canvas.rs",
          "amount: r.amount.unwrap_or(bert_core::rust_decimal::Decimal::ONE),",
          "amount: bert_core::rust_decimal::Decimal::ONE,")],
        ["-p", "bert-canvas", "--test", "canvas_round_trip"],
        "project() dropping the authored flow magnitude (#216 B2 — the rate-1.0 cap)",
    ),
    (
        "bags-dropped",
        [("crates/bert-canvas/src/canvas.rs",
          "agent.cognitive_params = t.cognitive_params.clone();", "")],
        ["-p", "bert-canvas", "--test", "canvas_round_trip"],
        "the canvas discarding engine params on projection (#216 — reservoir loses release_rate)",
    ),
    (
        "agency-dropped",
        [("crates/bert-canvas/src/canvas.rs",
          "agency_capacity: s.agent.as_ref().map(|a| a.agency_capacity),",
          "agency_capacity: None,")],
        ["-p", "bert-canvas", "--test", "canvas_round_trip"],
        "to_canvas() reverting a Modulating factor to the 0.5 default (#216 — homeostat)",
    ),
    (
        "env-ring-pinned",
        [("crates/bert-canvas/src/sl.rs",
          "ENV_RADIUS.max(center_offset + membrane_max + NODE_R + CLEARANCE)",
          "ENV_RADIUS")],
        ["-p", "bert-canvas", "--test", "layout_truthful"],
        "the pinned env ring drawing environment nodes ON the membrane (#216 E1 — C ∩ E ≠ ∅ in pictures)",
    ),
    (
        "two-comp-vertical",
        [("crates/bert-canvas/src/sl.rs",
          "2 => ring(slot, 2, COMPONENT_RADIUS, PI),",
          "2 => ring(slot, 2, COMPONENT_RADIUS, -FRAC_PI_2),")],
        ["-p", "bert-canvas", "--test", "layout_truthful"],
        "two-component models collapsing to one vertical line (#216 E2)",
    ),
    (
        "directed-unasserted",
        [("assets/corpus/bunge/two-thing-ab.sl", "@directed 1\n@directed 2", ""),
         ("assets/corpus/bunge/two-thing-ba.sl", "@directed 1\n@directed 2", "")],
        ["-p", "bert-canvas", "--test", "cross_lens", "entries_sharing"],
        "BOTH two-thing twins undirected — a▷b and b▷a collapse to one describe() output (#216 D1/G2)",
    ),
    (
        "membrane-hole-ignored",
        [("crates/bert-core/src/validate.rs",
          "if !enters && !leaves {",
          "if true {")],
        ["-p", "bert-core", "--lib", "crossing_flow_without_interface"],
        "the pre-#216 kernel, where a crossing flow could enter anywhere and I was inferred, not authored (A2)",
    ),
    (
        "env-word-rederived",
        [("crates/bert-canvas/src/sl.rs",
          '(Role::Environment, EnvKind::Sink) => "sink",',
          '(Role::Environment, EnvKind::Sink) => "source",')],
        ["-p", "bert-canvas", "--test", "environment_kind"],
        "emit_sl guessing the environment word from flow direction (#216 Wave 3 — `sink Drain` → `source Drain`)",
    ),
]


def run_test(args):
    return subprocess.run(
        ["cargo", "test", *args], cwd=ROOT, capture_output=True, text=True
    ).returncode


def main() -> int:
    only = sys.argv[1] if len(sys.argv) > 1 else None
    failures = []
    for name, patches, test, reintroduces in MUTATIONS:
        if only and name != only:
            continue
        originals = []
        stale = False
        for rel, present, _ in patches:
            text = (ROOT / rel).read_text()
            if present not in text:
                failures.append(f"{name}: anchor code not found in {rel} — table is stale")
                stale = True
            originals.append((ROOT / rel, text))
        if stale:
            continue
        try:
            for (path, text), (_, present, mutated) in zip(originals, patches):
                path.write_text(text.replace(present, mutated, 1))
            code = run_test(test)
        finally:
            for path, text in originals:
                path.write_text(text)
        if code == 0:
            failures.append(
                f"{name}: gate stayed GREEN under mutation — it cannot see {reintroduces}"
            )
            print(f"  BLIND {name}")
        else:
            print(f"  ok    {name} (gate goes red)")
    # Restore check runs only the gates the table names: the branch may carry
    # OTHER intentional reds (a red test is this repo's standing record of an
    # open defect), and this harness must not require the whole tree green.
    for test in {tuple(m[2]) for m in MUTATIONS}:
        if run_test(list(test)) != 0:
            failures.append(f"{' '.join(test)}: not green after restore — restore logic is broken")
    for f in failures:
        print(f"FAIL {f}", file=sys.stderr)
    print("mutation-check:", "FAILED" if failures else "OK —", len(MUTATIONS), "mutations, every gate refutable")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
