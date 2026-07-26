#!/usr/bin/env python3
"""Regenerate THIRD_PARTY_NOTICES.md (issue #229).

The notices are attribution the artifact owes to other people, so the inventory
half is read from the same metadata the build reads — `npm ls --prod` and
`cargo metadata` filtered to wasm32 — rather than maintained by hand, where it
would drift the first time a dependency changed. The full licence TEXTS are
hand-curated: only a few components carry a notice-retention condition whose
text must travel with the binary, and reproducing every dependency's text would
bury them.

Run: python3 scripts/gen_notices.py   (writes THIRD_PARTY_NOTICES.md)
     python3 scripts/gen_notices.py --check   (exit 1 if the file is stale)
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "THIRD_PARTY_NOTICES.md"
WEB = REPO / "web"


def npm_prod_packages() -> list[tuple[str, str, str]]:
    raw = subprocess.run(
        ["npm", "ls", "--prod", "--all", "--json"],
        cwd=WEB, capture_output=True, text=True,
    ).stdout
    tree = json.loads(raw)
    seen: dict[str, str] = {}

    def walk(node: dict) -> None:
        for name, child in (node.get("dependencies") or {}).items():
            if name in seen:
                continue
            seen[name] = child.get("version", "")
            walk(child)

    walk(tree)
    out = []
    for name in sorted(seen):
        manifest = WEB / "node_modules" / Path(*name.split("/")) / "package.json"
        licence = "UNRESOLVED"
        if manifest.is_file():
            pkg = json.loads(manifest.read_text())
            value = pkg.get("license") or pkg.get("licenses")
            if isinstance(value, list):
                value = " AND ".join(entry.get("type", "?") for entry in value)
            licence = str(value)
        out.append((name, seen[name], licence))
    return out


def cargo_wasm_packages() -> list[tuple[str, str, str]]:
    raw = subprocess.run(
        ["cargo", "metadata", "--format-version", "1",
         "--filter-platform", "wasm32-unknown-unknown"],
        cwd=REPO, capture_output=True, text=True,
    ).stdout
    meta = json.loads(raw)
    workspace = set(meta["workspace_members"])
    rows = [
        (p["name"], p["version"], str(p.get("license")))
        for p in meta["packages"]
        if p["id"] not in workspace
    ]
    return sorted(rows)


def table(rows: list[tuple[str, str, str]]) -> str:
    lines = ["| Package | Version | Declared licence |", "| --- | --- | --- |"]
    lines += [f"| `{n}` | {v} | {lic} |" for n, v, lic in rows]
    return "\n".join(lines)


def indent(text: str) -> str:
    return "\n".join(("    " + line).rstrip() for line in text.strip().splitlines())


UPSTREAM_MIT = """MIT License

Copyright (c) 2024 Halcyonic Systems

Original work by Joseph Ensminger

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE."""

HEADER = """# Third-party notices

Everything in this file is an obligation to someone else. It travels with the
artifact, not merely with the repository: `LICENSE` and this file are bundled
into the macOS app's `Contents/Resources/` and copied into `web/dist/` at build
time, because MIT and the SIL Open Font License both require their notices to
accompany *redistributions*, and a `.app` handed to a stranger is a
redistribution.

The inventory tables are generated from `npm ls --prod` and `cargo metadata`
(wasm32 platform filter) — the same metadata the build reads. Regenerate with
`python3 scripts/gen_notices.py` after any dependency change.

bert-lenses' own licence is unresolved; see `LICENSE`. That decision does not
affect anything below.
"""


def render() -> str:
    ofl = (WEB / "src" / "fonts" / "OFL.txt").read_text()
    katex = (WEB / "node_modules" / "katex" / "LICENSE").read_text()
    npm_rows = npm_prod_packages()
    cargo_rows = cargo_wasm_packages()

    return f"""{HEADER}
---

## 1. BERT — the vendored kernel

`crates/bert-core` and `crates/bert-compose` are vendored copies of code from
the BERT project (`halcyonic-systems/bert`), whose LICENSE is MIT. The
notice-retention condition travels with the copies, so the text is reproduced
here in full. `crates/bert-canvas` and `crates/bert-tether` were written in this
repository but sit on `bert-core`'s contract.

Note the contradiction recorded in `LICENSE`: the crate manifests declare
`Apache-2.0` while this, the governing upstream LICENSE, is MIT.

{indent(UPSTREAM_MIT)}

---

## 2. Bundled fonts — SIL Open Font License 1.1

Three faces are vendored as `.woff2` in `web/src/fonts/` and compiled into the
bundle (a desktop app has no network, so they cannot be fetched). The OFL
requires this notice to accompany the fonts.

{indent(ofl)}

---

## 3. KaTeX — MIT

KaTeX renders the formal notation. Its JavaScript and CSS are compiled into the
shipped bundle.

{indent(katex)}

---

## 4. npm dependencies reaching the artifact

Production dependencies only — the dev toolchain (Vite, Vitest, TypeScript,
Tailwind's compiler) builds the artifact but ships no code in it.

{table(npm_rows)}

---

## 5. Cargo dependencies reaching the wasm kernel

Resolved for `wasm32-unknown-unknown`, which is the only target whose code is
distributed. Workspace crates are omitted — they are §1 and this repository's
own work.

{table(cargo_rows)}
"""


def main() -> int:
    text = render()
    if "--check" in sys.argv:
        if not OUT.is_file() or OUT.read_text() != text:
            print(f"{OUT.name} is stale — run: python3 scripts/gen_notices.py", file=sys.stderr)
            return 1
        return 0
    OUT.write_text(text)
    print(f"wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
