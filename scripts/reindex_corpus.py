#!/usr/bin/env python3
"""Regenerate assets/corpus/corpus.json from the entries' provenance headers.

The index stays a committed file that the ship gate checks
(crates/bert-canvas/tests/source_corpus.rs) — this only removes the chance of a
hand-copied `citation` drifting from the §3.2 composition rule, which is the one
field with a mechanical definition. ORDER below is the editorial decision the
index carries and the one thing this script will not invent: adding a file
without listing it here fails loudly rather than silently appending.

    python3 scripts/reindex_corpus.py
    cargo test -p bert-canvas --test source_corpus
"""
import json
import pathlib
import sys

# Gallery order — editorial, roughly by simplicity, capstones last.
ORDER = [
    # Klir — the classroom example first
    "klir/students-in-a-course.sl",
    # Klir — one composition, four structures; the diff is the lesson
    "klir/goal-oriented-informationless.sl",
    "klir/goal-oriented-feedback.sl",
    "klir/goal-oriented-feedforward.sl",
    "klir/goal-oriented-full-information.sl",
    # Bunge — one composition, three structures; the same device, independently
    "bunge/two-thing-ab.sl",
    "bunge/two-thing-ba.sl",
    "bunge/two-thing-bidirectional.sl",
    # Bunge — coupling graphs
    "bunge/coupling-sigma1.sl",
    "bunge/coupling-sigma2.sl",
    "bunge/coupling-sigma3.sl",
    # Klir — the two largest
    "klir/cellular-array-cell.sl",
    "klir/serial-binary-adder.sl",
    "klir/criminal-court.sl",
    # Mobus — his own SL exemplar, the SOI situated in its environment
    "mobus/steel-plant.sl",
]

ROOT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "corpus"


def header(path):
    """The single-valued header fields. `note` is repeatable and unused here."""
    fields = {}
    for line in path.read_text().splitlines()[1:]:
        if not line.strip():
            break
        key, value = line[2:].split(": ", 1)
        if key != "note":
            fields[key] = value
    return fields


def citation(h):
    """§3.2's composition rule, and no other."""
    base = f'{h["author"]}, {h["work"]} ({h["year"]}), {h["locus"]}'
    return f'{base}, {h["figure"]}' if "figure" in h else base


def main():
    on_disk = sorted(str(p.relative_to(ROOT)) for p in ROOT.rglob("*.sl"))
    missing = sorted(set(on_disk) - set(ORDER))
    extra = sorted(set(ORDER) - set(on_disk))
    if missing or extra:
        for f in missing:
            print(f"error: {f} is on disk but not in ORDER — add it, order is editorial", file=sys.stderr)
        for f in extra:
            print(f"error: {f} is in ORDER but not on disk", file=sys.stderr)
        return 1

    entries = []
    for rel in ORDER:
        h = header(ROOT / rel)
        entry = {
            "file": rel,
            "tradition": rel.split("/")[0],
            "title": h["title"],
            "citation": citation(h),
            "teaches": h["teaches"],
        }
        # Sibling-set membership (#148): models that teach by diff over one
        # fixed composition (Klir's goal-oriented paradigms, Bunge's two-thing
        # structures / coupling graphs). Optional — a standalone entry omits it.
        if "set" in h:
            entry["set"] = h["set"]
        entries.append(entry)

    out = json.dumps({"version": 1, "entries": entries}, indent=2, ensure_ascii=False) + "\n"
    (ROOT / "corpus.json").write_text(out)
    print(f"✓ corpus.json — {len(entries)} entries")
    return 0


if __name__ == "__main__":
    sys.exit(main())
