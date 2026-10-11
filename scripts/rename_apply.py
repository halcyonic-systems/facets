#!/usr/bin/env python3
"""Apply the rename map (facets#541) to the tree, one class at a time.

The inventory (`rename_inventory.py`) files every occurrence of an old name under
one class; this script rewrites the occurrences whose class is asked for and
whose old name has a rename row in `docs/rename/map.csv` for the phase being
applied, and nothing else. A token the classifier files under an in-scope class
but the map does not rename (the `../bert-lenses/` output path in the gates
truth table, a wrapped path) is printed as `left`, so the hand edits a phase
needs are listed by the tool rather than discovered by the gates.

  --classes A,B    the classes to rewrite (required outside --self-test)
  --phase N        the map phase whose rows apply (default 2)
  --include P      only files whose path starts with P (repeatable)
  --exclude P      skip files whose path starts with P (repeatable)
  --dry-run        print every replacement, write nothing
  --self-test      apply phase 2 to a copy of the phase 1 fixture tree and check
                   that exactly the mapped rows went, and nothing else moved

Stdlib only. Classification is the inventory's: every token on a line is
classified against the original line before any of them is rewritten, so a
replacement never changes how its neighbour is filed. Directories are not
moved here (`git mv` does that, with history); the paths inside files are.
"""

import argparse
import csv
import os
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rename_inventory as inv  # noqa: E402

ROOT = inv.ROOT
MAP = inv.RENAME_DIR / "map.csv"
SELF_SKIP = {"scripts/rename_apply.py"}


def load_map(path: Path, phase: str, classes: set[str]) -> dict[tuple[str, str], str]:
    """(old, class) -> new, for the rename rows of PHASE whose class is asked for."""
    out = {}
    with path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            old, new, cls = row["old"], row["new"], row["class"]
            if row["phase"] != phase or cls not in classes:
                continue
            if not inv.TOKEN.fullmatch(old) or new in {"keep", "*", "(not in tree)"} or old == new:
                continue
            out[(old.lower(), cls)] = new
    return out


def scan(root: Path, rel: str, line: str):
    """Every old-name token on LINE with its class, as (start, end, token, class)."""
    return [(m.start(), m.end(), m.group(0), inv.classify(rel, line, m.start(), m.end())) for m in inv.TOKEN.finditer(line)]


def rewrite_line(root: Path, rel: str, no: int, line: str, mapping, classes, report):
    hits = scan(root, rel, line)
    out, last, n = [], 0, 0
    for start, end, tok, cls in hits:
        if cls not in classes:
            continue
        new = mapping.get((tok.lower(), cls))
        if new is None:
            report["left"].append((rel, no, cls, tok))
            continue
        if tok != tok.lower():
            report["case"].append((rel, no, cls, tok))
            continue
        out.append(line[last:start])
        out.append(new)
        last = end
        n += 1
        report["each"].append((rel, no, cls, tok, new))
    out.append(line[last:])
    return "".join(out), n


def apply(root: Path, mapping, classes, include, exclude, dry_run: bool):
    report = {"each": [], "left": [], "case": [], "files": []}
    for rel in inv.tracked_files(root):
        if rel in SELF_SKIP:
            continue
        if include and not rel.startswith(tuple(include)):
            continue
        if exclude and rel.startswith(tuple(exclude)):
            continue
        path = root / rel
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        lines = text.splitlines(keepends=True)
        changed, count = [], 0
        for no, raw in enumerate(lines, start=1):
            body = raw.rstrip("\r\n")
            nl = raw[len(body):]
            new_body, n = rewrite_line(root, rel, no, body, mapping, classes, report)
            changed.append(new_body + nl)
            count += n
        if count:
            report["files"].append((rel, count))
            if not dry_run:
                path.write_text("".join(changed), encoding="utf-8")
    return report


def print_report(report, dry_run: bool):
    if dry_run:
        for rel, no, cls, tok, new in report["each"]:
            print(f"{rel}:{no}: [{cls}] {tok} -> {new}")
        print()
    for rel, n in report["files"]:
        print(f"{'would rewrite' if dry_run else 'rewrote'} {n:4}  {rel}")
    total = sum(n for _, n in report["files"])
    print(f"\n{total} replacements in {len(report['files'])} files")
    if report["left"]:
        print(f"\n{len(report['left'])} in-scope tokens the map does not rename (left in place):")
        for rel, no, cls, tok in report["left"]:
            print(f"  {rel}:{no}: [{cls}] {tok}")
    if report["case"]:
        print(f"\n{len(report['case'])} tokens skipped because their case differs from the map:")
        for rel, no, cls, tok in report["case"]:
            print(f"  {rel}:{no}: [{cls}] {tok}")


def rows_with_tokens(root: Path):
    """(path, line, class, token) for every occurrence, the key the self-test compares."""
    out = Counter()
    for rel in inv.tracked_files(root):
        text = (root / rel).read_text(encoding="utf-8")
        for no, line in enumerate(text.splitlines(), start=1):
            for _, _, tok, cls in scan(root, rel, line):
                out[(rel, no, cls, tok.lower())] += 1
    return out


PHASE_2_CLASSES = {"crate-dir", "cargo-name", "rust-ident", "import", "workflow"}


def self_test(root: Path) -> int:
    src = root / inv.SELF_TEST_TREE
    mapping = load_map(root / MAP, "2", PHASE_2_CLASSES)
    with tempfile.TemporaryDirectory() as tmp:
        tree = Path(tmp) / "tree"
        shutil.copytree(src, tree)
        subprocess.run(["git", "-C", str(tree), "init", "-q"], check=True)
        before = rows_with_tokens(tree)
        report = apply(tree, mapping, PHASE_2_CLASSES, [], [], dry_run=False)
        after = rows_with_tokens(tree)
    went = Counter((rel, no, cls, tok) for rel, no, cls, tok, _ in report["each"])
    expected = before - went
    problems = []
    if not went:
        problems.append("nothing was rewritten")
    if after != expected:
        for key in sorted((expected - after) | (after - expected)):
            problems.append(f"  {key}: expected {expected[key]}, got {after[key]}")
        problems.insert(0, "the tree after the apply is not the tree before minus the mapped rows:")
    still = [k for k in after if k[2] in PHASE_2_CLASSES and (k[3], k[2]) in mapping]
    if still:
        problems.append(f"mapped rows survived the apply: {still}")
    stayed = {cls for _, _, cls, _ in after}
    for cls in ("doc-prose", "golden", "format-tag", "lineage", "cli-word"):
        if cls not in stayed:
            problems.append(f"the fixture tree lost every {cls} row; the apply touched a class it was not asked for")
    phase3_import = [k for k in after if k[2] == "import" and k[0].endswith(".ts")]
    if not phase3_import:
        problems.append("the phase 3 TS import row did not survive a phase 2 apply")
    if problems:
        print("rename_apply self-test:", file=sys.stderr)
        print("\n".join(problems), file=sys.stderr)
        return 1
    print(f"rename_apply self-test ok ({sum(went.values())} of {sum(before.values())} fixture rows rewritten, "
          f"{len(report['left'])} left for the hand, {sum(after.values())} remain)")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--classes", help="comma-separated inventory classes to rewrite")
    p.add_argument("--phase", default="2", help="map phase whose rename rows apply (default 2)")
    p.add_argument("--map", default=str(ROOT / MAP))
    p.add_argument("--root", default=str(ROOT))
    p.add_argument("--include", action="append", default=[], help="path prefix to restrict to (repeatable)")
    p.add_argument("--exclude", action="append", default=[], help="path prefix to skip (repeatable)")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args(argv)
    root = Path(args.root).resolve()
    if args.self_test:
        return self_test(root)
    if not args.classes:
        p.error("--classes is required")
    classes = set(args.classes.split(","))
    unknown = classes - set(inv.CLASSES)
    if unknown:
        p.error(f"unknown classes: {sorted(unknown)}")
    mapping = load_map(Path(args.map), args.phase, classes)
    if not mapping:
        p.error(f"the map has no phase {args.phase} rename rows for classes {sorted(classes)}")
    report = apply(root, mapping, classes, args.include, args.exclude, args.dry_run)
    print_report(report, args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
