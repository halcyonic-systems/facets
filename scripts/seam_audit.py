#!/usr/bin/env python3
"""Seam-readiness audit over the models that ship with the Model face.

Continuous zoom (#139) opens only where a model asserts a process inside a
process. The kernel's boundary contract (`crates/bert-core/src/decomposition.rs`,
transcribing `Systems/Core/Decomposition.lean`) says why: a child's boundary
must REFINE each crossing of the parent component — same substance kind, same
environmental counterparty by name, landing on a named child interface. A
component whose crossings are untyped, or which has no crossings at all,
therefore cannot be decomposed no matter what the surface offers.

This script asks, of every model on the gallery's "Ships with the app" shelf,
which components could carry a seam today. It is READ-ONLY: it compiles each
`.sl` with the real kernel (`bert compile`, the headless door in
`crates/bert-cli`) and reads the CanvasModel that comes back. It decides
nothing the kernel does not already carry — role, primitive, interface flag,
bond kind, substance, `decomposes` reference are all fields of the compiled
model.

Per component:

  READY     at least one crossing, and every crossing carries a declared
            substance kind and a named counterparty
  ONE-STEP  crossings exist, but one or more is untyped (`Kind::Unspecified`)
            or the counterparty is unnamed
  NONE      no crossings — an isolated node, or joined only by `mere`
            relations, which never project and so never cross anything

`Kind::Unspecified` counts as untyped even though `kind_to_substance` in
canvas.rs maps it to `Energy` at projection. The seam check would compare
multisets of `Energy` and pass; the author never said so. A seam that holds
because of a default is not a seam the author asserted.

Per model:

  SYSTEM           a boundary exists (environment things or interface
                   components) and something transforms or a flow is typed
  NETWORK          peers and relations, no boundary, nothing transforms
  FLAT-BY-DESIGN   NETWORK-shaped, but a corpus transcription carrying a
                   citation — the source stopped at one level on purpose

Usage:
    python3 scripts/seam_audit.py [--bert PATH] [--out PATH] [--json]

Requires the `bert` binary. Build it with `cargo build -p bert-cli --bin bert`
(or pass `--bert target/debug/bert`); the script finds it in `target/debug`,
`target/release`, or `$PATH`.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

UNTYPED = "Unspecified"


# --- the shipped set --------------------------------------------------------
# Enumerated the way web/src/home.ts shippedModels() enumerates it, so this
# audit cannot drift from the gallery: runnable demos (assets/demos/*.json)
# + structural examples (assets/examples/*.sl, minus any whose title a demo
# already claims) + the hand-registered steel-plant walk + every corpus entry
# in assets/corpus/corpus.json.


@dataclass
class Shipped:
    key: str
    title: str
    shelf: str  # "example" | "corpus"
    group: str  # genus, or tradition
    path: Path
    citation: str = ""


def _sl_title(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("system "):
            parts = stripped.split('"')
            if len(parts) >= 2:
                return parts[1]
    return ""


def _sl_genus(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("system ") and ":" in stripped and "/" in stripped:
            tail = stripped.split(":", 1)[1]
            if "/" in tail:
                return tail.split("/", 1)[1].strip().split()[0]
    return "Unclassified"


def shipped_models() -> list[Shipped]:
    rows: list[Shipped] = []

    demo_titles: set[str] = set()
    for bundle in sorted((REPO / "assets" / "demos").glob("*.json")):
        b = json.loads(bundle.read_text(encoding="utf-8"))
        demo_titles.add(b["title"])
        rows.append(
            Shipped(
                key=b["model"],
                title=b["title"],
                shelf="example",
                group=b.get("genus", "Unclassified"),
                path=REPO / "assets" / "examples" / f"{b['model']}.sl",
            )
        )

    for sl in sorted((REPO / "assets" / "examples").glob("*.sl")):
        text = sl.read_text(encoding="utf-8")
        title = _sl_title(text)
        if title in demo_titles:
            continue  # the demo row already carries it
        rows.append(
            Shipped(
                key=f"example:{sl.stem}",
                title=title or sl.stem,
                shelf="example",
                group=_sl_genus(text),
                path=sl,
            )
        )

    # Registered by hand in examples.ts, beside the two levels it opens onto.
    # Level 0 is the gallery row; levels 1 and 2 ship with it and are what its
    # `decomposes` references resolve to, so they are audited as their own rows
    # even though the gallery never lists them. The `.json` beside each level is
    # the archive of the same model (the steel_walkthrough gate pins them to the
    # `.sl`), so auditing the `.sl` audits both.
    walk = REPO / "assets" / "walkthroughs" / "steel-plant"
    for level, title in (
        (0, "The Steel-Plant, three levels deep"),
        (1, "Steel-Plant walk — level 1 (Fig. 4.16 interior)"),
        (2, "Steel-Plant walk — level 2 (Iron-Inventory's room)"),
    ):
        rows.append(
            Shipped(
                key=f"walkthrough:steel-plant-level-{level}",
                title=title,
                shelf="example" if level == 0 else "walkthrough",
                group="Technical",
                path=walk / f"level-{level}.sl",
            )
        )

    index = json.loads((REPO / "assets" / "corpus" / "corpus.json").read_text(encoding="utf-8"))
    for e in index["entries"]:
        rows.append(
            Shipped(
                key=e["file"],
                title=e["title"],
                shelf="corpus",
                group=e["tradition"],
                path=REPO / "assets" / "corpus" / e["file"],
                citation=e.get("citation", ""),
            )
        )
    return rows


# --- the kernel -------------------------------------------------------------


def find_bert(explicit: str | None) -> Path:
    if explicit:
        p = Path(explicit)
        if p.is_file():
            return p
        sys.exit(f"seam_audit: no bert binary at {p}")
    for candidate in (REPO / "target" / "release" / "bert", REPO / "target" / "debug" / "bert"):
        if candidate.is_file():
            return candidate
    found = shutil.which("bert")
    if found:
        return Path(found)
    sys.exit(
        "seam_audit: no bert binary found. Build it:\n"
        "  cargo build -p bert-cli --bin bert\n"
        "or pass --bert PATH."
    )


def compile_model(bert: Path, path: Path) -> dict:
    proc = subprocess.run(
        [str(bert), "compile", str(path)], capture_output=True, text=True, check=False
    )
    if proc.returncode != 0:
        raise RuntimeError(f"{path.name}: bert compile exited {proc.returncode}\n{proc.stderr}")
    return json.loads(proc.stdout)


# --- the check --------------------------------------------------------------


@dataclass
class Crossing:
    direction: str  # "in" | "out"
    kind: str
    substance: str
    counterparty: str
    label: str

    @property
    def typed(self) -> bool:
        return self.kind != UNTYPED

    @property
    def named(self) -> bool:
        return bool(self.counterparty.strip())


@dataclass
class ComponentReport:
    name: str
    role: str
    primitive: str
    interface: bool
    decomposes: bool
    crossings: list[Crossing] = field(default_factory=list)
    mere: int = 0

    @property
    def inbound(self) -> list[Crossing]:
        return [c for c in self.crossings if c.direction == "in"]

    @property
    def outbound(self) -> list[Crossing]:
        return [c for c in self.crossings if c.direction == "out"]

    @property
    def verdict(self) -> str:
        if not self.crossings:
            return "NONE"
        if all(c.typed and c.named for c in self.crossings):
            return "READY"
        return "ONE-STEP"

    @property
    def blockers(self) -> list[str]:
        out = []
        untyped = [c.label for c in self.crossings if not c.typed]
        unnamed = [c.label for c in self.crossings if not c.named]
        if untyped:
            out.append("untyped: " + ", ".join(untyped))
        if unnamed:
            out.append("unnamed counterparty: " + ", ".join(unnamed))
        if not self.crossings and self.mere:
            out.append(f"{self.mere} mere relation(s), no bond")
        return out


@dataclass
class ModelReport:
    shipped: Shipped
    components: list[ComponentReport]
    env_things: int
    typed_flows: int
    total_bonds: int
    mere_relations: int
    kind: str
    lens: str
    transforms: bool
    unnamed_substance: int

    def count(self, verdict: str) -> int:
        return sum(1 for c in self.components if c.verdict == verdict)


def audit(bert: Path, s: Shipped) -> ModelReport:
    model = compile_model(bert, s.path)
    things = {t["id"]: t for t in model.get("things", [])}
    relations = model.get("relations", [])

    comps: list[ComponentReport] = []
    for t in model.get("things", []):
        if t.get("role", "Component") != "Component":
            continue
        rep = ComponentReport(
            name=t.get("name", ""),
            role=t.get("role", "Component"),
            primitive=t.get("primitive") or "—",
            interface=bool(t.get("interface")),
            decomposes=t.get("child_model") is not None,
        )
        for r in relations:
            a, b = r["a"], r["b"]
            if t["id"] not in (a, b):
                continue
            if not r.get("is_bond", True):
                rep.mere += 1
                continue
            other = b if a == t["id"] else a
            rep.crossings.append(
                Crossing(
                    direction="out" if a == t["id"] else "in",
                    kind=r.get("kind", UNTYPED),
                    substance=r.get("substance", ""),
                    counterparty=things.get(other, {}).get("name", ""),
                    label=r.get("name") or f"{things.get(a,{}).get('name','?')}→{things.get(b,{}).get('name','?')}",
                )
            )
        comps.append(rep)

    env_things = sum(1 for t in model.get("things", []) if t.get("role") == "Environment")
    bonds = [r for r in relations if r.get("is_bond", True)]
    typed_flows = sum(1 for r in bonds if r.get("kind", UNTYPED) != UNTYPED)
    mere_relations = len(relations) - len(bonds)

    unnamed_substance = sum(1 for r in bonds if not r.get("substance", "").strip())

    has_boundary = env_things > 0 or any(c.interface for c in comps)
    transforms = any(c.primitive != "—" for c in comps)
    if has_boundary and (transforms or typed_flows):
        kind = "SYSTEM"
    elif s.shelf == "corpus" and s.citation:
        kind = "FLAT-BY-DESIGN"
    else:
        kind = "NETWORK"

    return ModelReport(
        shipped=s,
        components=comps,
        env_things=env_things,
        typed_flows=typed_flows,
        total_bonds=len(bonds),
        mere_relations=mere_relations,
        kind=kind,
        lens=model.get("lens", "?"),
        transforms=transforms,
        unnamed_substance=unnamed_substance,
    )


# --- rendering --------------------------------------------------------------


def render(reports: list[ModelReport]) -> str:
    out: list[str] = []
    w = out.append

    w(
        "| Model | Shelf | Kind | Lens | Comps | READY | ONE-STEP | NONE | Env | Bonds "
        "| Typed kind | Named subst. | Mere | Transforms |"
    )
    w("|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|:-:|")
    for r in reports:
        w(
            f"| {r.shipped.title} | {r.shipped.shelf}/{r.shipped.group} | {r.kind} | {r.lens} "
            f"| {len(r.components)} | {r.count('READY')} | {r.count('ONE-STEP')} | {r.count('NONE')} "
            f"| {r.env_things} | {r.total_bonds} | {r.typed_flows} "
            f"| {r.total_bonds - r.unnamed_substance} | {r.mere_relations} "
            f"| {'yes' if r.transforms else '—'} |"
        )

    w("")
    totals = {v: sum(x.count(v) for x in reports) for v in ("READY", "ONE-STEP", "NONE")}
    kinds = {}
    for r in reports:
        kinds[r.kind] = kinds.get(r.kind, 0) + 1
    gallery = sum(1 for r in reports if r.shipped.shelf != "walkthrough")
    interiors = len(reports) - gallery
    w(
        f"**Totals.** {gallery} gallery rows + {interiors} walkthrough interiors = "
        f"{len(reports)} models audited · "
        + " · ".join(f"{n} {k}" for k, n in sorted(kinds.items()))
        + " · components: "
        + " · ".join(f"{n} {v}" for v, n in totals.items())
    )

    w("")
    w("## Per component")
    w("")
    for r in reports:
        w(f"### {r.shipped.title}")
        w("")
        w(f"`{r.shipped.path.relative_to(REPO)}` — {r.kind}, {r.lens} lens")
        if r.shipped.citation:
            w("")
            w(f"Citation: {r.shipped.citation}")
        w("")
        if not r.components:
            w("No components.")
            w("")
            continue
        w("| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |")
        w("|---|---|:-:|:-:|--:|--:|--:|---|---|")
        for c in r.components:
            blockers = "; ".join(c.blockers) or "—"
            w(
                f"| {c.name} | {c.primitive} | {'yes' if c.interface else '—'} "
                f"| {'yes' if c.decomposes else '—'} | {len(c.inbound)} | {len(c.outbound)} "
                f"| {c.mere} | {c.verdict} | {blockers} |"
            )
        w("")
        for c in r.components:
            if not c.crossings:
                continue
            for x in c.crossings:
                sub = x.substance or "(no substance name)"
                w(
                    f"- `{c.name}` {x.direction}: {x.label} — kind `{x.kind}`, "
                    f"substance `{sub}`, counterparty `{x.counterparty or '(unnamed)'}`"
                )
        w("")
    return "\n".join(out)


# The line a report file is spliced at. Everything BELOW it is regenerated;
# everything above is the hand-written judgment, which no run may overwrite —
# an audit whose opinions a rerun silently deletes is not an audit.
MARKER = "<!-- seam_audit.py output below -->"


def write_out(path: Path, body: str) -> None:
    if path.exists() and MARKER in path.read_text(encoding="utf-8"):
        head = path.read_text(encoding="utf-8").split(MARKER)[0]
        path.write_text(f"{head}{MARKER}\n\n{body}\n", encoding="utf-8")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--bert", help="path to the bert binary")
    ap.add_argument("--out", help="also write the Markdown report here")
    ap.add_argument("--json", action="store_true", help="emit machine-readable JSON instead")
    args = ap.parse_args()

    bert = find_bert(args.bert)
    reports = [audit(bert, s) for s in shipped_models()]

    if args.json:
        print(
            json.dumps(
                [
                    {
                        "title": r.shipped.title,
                        "path": str(r.shipped.path.relative_to(REPO)),
                        "shelf": r.shipped.shelf,
                        "group": r.shipped.group,
                        "kind": r.kind,
                        "lens": r.lens,
                        "components": [
                            {
                                "name": c.name,
                                "primitive": c.primitive,
                                "interface": c.interface,
                                "decomposes": c.decomposes,
                                "inbound": len(c.inbound),
                                "outbound": len(c.outbound),
                                "mere": c.mere,
                                "verdict": c.verdict,
                                "blockers": c.blockers,
                            }
                            for c in r.components
                        ],
                    }
                    for r in reports
                ],
                indent=2,
            )
        )
        return 0

    body = render(reports)
    print(body)
    if args.out:
        write_out(Path(args.out), body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
