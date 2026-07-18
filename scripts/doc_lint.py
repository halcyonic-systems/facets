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


def main() -> int:
    all_violations: list[str] = []
    for doc in live_docs():
        all_violations += check_file(doc)

    if all_violations:
        print("doc-lint: provenance drift in LIVE docs (issue #92)\n", file=sys.stderr)
        for v in all_violations:
            print(f"  {v}", file=sys.stderr)
        print(
            "\nLIVE docs must cite the terminology concordance, not re-assert provenance.",
            file=sys.stderr,
        )
        return 1

    print(f"doc-lint: OK — {len(live_docs())} LIVE docs clean")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
