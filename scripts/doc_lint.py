#!/usr/bin/env python3
"""Provenance drift-gate for LIVE docs (issue #92).

The terminology concordance is the authoritative attribution source. LIVE docs
must *cite* it, not re-assert Mobus/Bunge provenance on their own. Three checks:

  1. tuple-glyph        — an opening `⟨C, N, E` tuple must sit in a block that
                          (or whose next block) carries a provenance reference.
  2. Mobus-8-tuple      — "Mobus" tightly bound to "8-tuple" (an attribution
                          claim, not an incidental section cite) needs the same.
  3. Bunge-CESM         — a bare `σ = ⟨C, E, S, M⟩` claims Bunge's *delivered*
                          surface is CESM; the repo's delivered Bunge surface is
                          CES (M is a structural note). Flag unless the line
                          grounds it (Bunge 2004 or `mechanism_note`).

Provenance reference = a mention of the concordance, a "Lean improvement", or a
"row 1" pointer. Scope is the LIVE doc set only; docs/archive/** and the design
notes under docs/design/** are out of scope by design.

Exit non-zero on any violation so `just check` / CI fail on drift.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# --- LIVE doc set -----------------------------------------------------------
# README.md + top-level docs/*.md (NOT docs/archive/**, NOT docs/design/**)
# + docs/language/*.md. A file's presence here means "published, load-bearing".
def live_docs() -> list[Path]:
    docs = [REPO / "README.md"]
    docs += sorted((REPO / "docs").glob("*.md"))
    docs += sorted((REPO / "docs" / "language").glob("*.md"))
    return [d for d in docs if d.is_file()]


# --- patterns ---------------------------------------------------------------
TUPLE_GLYPH = re.compile(r"⟨C, N, E")
# "Mobus" bound tightly to "8-tuple" — an attribution claim. The 50-codepoint
# leash lets the inline glyph form ("Mobus** `S = ⟨C, N, E, ...⟩` (8-tuple")
# through while excluding incidental co-occurrence across clause boundaries
# (e.g. "Mobus §4.3.1) ... gated on the 8-tuple decomposition math").
MOBUS_8TUPLE = re.compile(r"Mobus.{0,50}8-tuple")
CESM = re.compile(r"σ = ⟨C, E, S, M⟩")

PROVENANCE = re.compile(r"concordance|[Ll]ean.{0,40}improvement|row 1")
CESM_GROUND = re.compile(r"2004|mechanism_note")


def blocks(text: str) -> list[tuple[int, str]]:
    """Split into blank-line-separated blocks; return (1-based start line, text)."""
    out: list[tuple[int, str]] = []
    line_no = 1
    cur: list[str] = []
    start = 1
    for line in text.splitlines():
        if line.strip() == "":
            if cur:
                out.append((start, "\n".join(cur)))
                cur = []
            line_no += 1
            start = line_no
            continue
        if not cur:
            start = line_no
        cur.append(line)
        line_no += 1
    if cur:
        out.append((start, "\n".join(cur)))
    return out


def provenanced(idx: int, blks: list[tuple[int, str]]) -> bool:
    """Provenance may live in the trigger's block or the one immediately after
    it (the `**Mobus — 8-tuple**` heading + following `Provenance:` paragraph)."""
    window = blks[idx][1]
    if idx + 1 < len(blks):
        window += "\n" + blks[idx + 1][1]
    return bool(PROVENANCE.search(window))


def check_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    rel = path.relative_to(REPO)
    blks = blocks(text)
    violations: list[str] = []

    for idx, (start, body) in enumerate(blks):
        # tuple-glyph and Mobus-8-tuple: line-scoped trigger, block-scoped provenance
        for pat, label in ((TUPLE_GLYPH, "tuple-glyph"), (MOBUS_8TUPLE, "Mobus-8-tuple")):
            for off, line in enumerate(body.splitlines()):
                if pat.search(line) and not provenanced(idx, blks):
                    violations.append(
                        f"{rel}:{start + off}: {label} without provenance "
                        f"(needs concordance / Lean improvement / row 1 nearby): {line.strip()[:80]}"
                    )
                    break  # one hit per block is enough

    # Bunge-CESM: line-scoped trigger AND line-scoped grounding
    for line_no, line in enumerate(text.splitlines(), start=1):
        if CESM.search(line) and not CESM_GROUND.search(line):
            violations.append(
                f"{rel}:{line_no}: Bunge CESM asserted as delivered "
                f"(delivered surface is CES; add Bunge 2004 / mechanism_note grounding): {line.strip()[:80]}"
            )
    return violations


# --- mode-entry vocabulary gate (issue #90) --------------------------------
# "ladder"/"rung"/"climb" carried three unrelated senses (see the archived
# docs/archive/on-the-word-ladder.md concordance). Only the MODE-ENTRY sense is
# a fidelity hazard: it implies Klir→Bunge→Mobus is a linear tower, but the Lean
# proves parallel lenses over a meet-semilattice. That sense is retired — mode
# entry now speaks "lens" vocabulary. This check keeps it retired.
#
# Scope: LIVE docs (same set as above) + string literals in web/src/**/*.{ts,tsx}.
# It flags whole-word ladder/rung/climb, then exempts lines that carry a
# SURVIVING-sense marker. The surviving senses (left untouched by #90):
#   - project/build-plan phase: "analysis rung", "staged rung", "rung plan",
#     "first rung", explicit "Rung N/Rung A" SL build-plan labels;
#   - the compose "dependency ladder" (bert-compose) and per-edge "edge ladder"
#     classification (bert-canvas) — real orderings, correctly named;
#   - Klir's GSPS hierarchy of system types;
#   - meta-discussion of the retired term itself: any reference to the archived
#     `on-the-word-ladder` concordance, or the quoted `ladder/rung` term-set.
# web/src COMMENTS are out of scope by design — the Bucket C "edge ladder" name
# legitimately lives in JSDoc there; only quoted string literals are checked.
MODE_ENTRY_WORD = re.compile(r"\b(?:ladder|rung|climb)\b", re.IGNORECASE)
# Case-SENSITIVE by design: the "Rung N" label pattern must not match "rung on",
# "rung of", etc. All prose survivors use lowercase phrases; only the capitalized
# SL build-plan labels ("Rung 2") and the "GSPS" acronym carry uppercase.
SURVIVING_SENSE = re.compile(
    r"analysis rung"
    r"|rung plan"
    r"|staged rung"
    r"|first[\s-]rung"
    r"|\bRungs?\s+[0-9A-Z]"          # "Rung 2", "Rungs 1", "Rung A" — SL build-plan labels
    r"|dependency ladder"
    r"|edge ladder"
    r"|compose ladder"
    r"|\bGSPS\b"
    r"|on-the-word-ladder"            # references to the archived concordance file
    r"|ladder/rung"                   # meta-quotation of the retired term-set
)
# Quoted string literal on a line: "...", '...', or `...` (naive, line-local —
# enough to separate a user-facing string from a // or /** */ comment).
STRING_LITERAL = re.compile(r'"[^"]*"' r"|'[^']*'" r"|`[^`]*`")


def mode_entry_vocab() -> list[str]:
    violations: list[str] = []

    # LIVE docs: whole-line scan, surviving-sense marker exempts the line.
    for path in live_docs():
        rel = path.relative_to(REPO)
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if MODE_ENTRY_WORD.search(line) and not SURVIVING_SENSE.search(line):
                violations.append(
                    f"{rel}:{line_no}: mode-entry 'ladder/rung/climb' in a LIVE doc "
                    f"(use lens vocabulary; retired per #90): {line.strip()[:80]}"
                )

    # web/src string literals only (comments are out of scope).
    web_src = REPO / "web" / "src"
    if web_src.is_dir():
        for path in sorted(web_src.rglob("*.ts")) + sorted(web_src.rglob("*.tsx")):
            rel = path.relative_to(REPO)
            for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
                if SURVIVING_SENSE.search(line):
                    continue
                for lit in STRING_LITERAL.findall(line):
                    if MODE_ENTRY_WORD.search(lit):
                        violations.append(
                            f"{rel}:{line_no}: mode-entry 'ladder/rung/climb' in a "
                            f"user-facing string (use lens vocabulary; #90): {lit[:80]}"
                        )
                        break
    return violations


def main() -> int:
    all_violations: list[str] = []
    for doc in live_docs():
        all_violations += check_file(doc)

    mode_violations = mode_entry_vocab()

    if all_violations or mode_violations:
        if all_violations:
            print("doc-lint: provenance drift in LIVE docs (issue #92)\n", file=sys.stderr)
            for v in all_violations:
                print(f"  {v}", file=sys.stderr)
            print(
                "\nLIVE docs must cite the terminology concordance, not re-assert provenance.",
                file=sys.stderr,
            )
        if mode_violations:
            print("\ndoc-lint: mode-entry 'ladder/rung/climb' vocabulary (issue #90)\n", file=sys.stderr)
            for v in mode_violations:
                print(f"  {v}", file=sys.stderr)
            print(
                "\nMode entry is a lattice of parallel lenses, not a ladder. Say "
                '"enter the Bunge lens" / "satisfy the Bunge precondition", never a rung to climb.',
                file=sys.stderr,
            )
        return 1

    print(f"doc-lint: OK — {len(live_docs())} LIVE docs clean, mode-entry vocabulary clean")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
