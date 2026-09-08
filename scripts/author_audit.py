#!/usr/bin/env python3
"""Does the co-author draft depth, or only a boundary? (facets#377, the rig.)

Runs a fixed set of one-sentence descriptions through the live `/author-sl`
route on one or more models, several draws each, and scores every draft
mechanically off the compiled model. Nothing here judges: `bert compile` says
whether the text is a model, `bert verdict --lens mobus` says whether the
kernel accepts it at Operational mode, and every other number is a count over
fields the compiled model already carries (`primitive`, `interface`,
`description`, relation `kind`, thing `role`).

The loop mirrors the client's `draftSlWithRetry` (web/src/coauthor.ts): a
draft that does not compile is healed through the same `prior_sl` + `errors`
seam (up to two parse heals); a draft that compiles but the kernel refuses is
sent back ONCE with the kernel's Error findings (#377 M1). Both the first
draft and the final one are scored, so the table shows what the prompt
produces (M2) and what the loop repairs (M1) as two different columns.

Why several draws: the 2026-09-07 aquarium series drew the same prompt four
times and got "refused" three times and "clean" once. The baseline is a
distribution, so `--draws` defaults to 3 and the table reports rates.

    python3 scripts/author_audit.py --label before --model claude-haiku-4-5-20251001
    python3 scripts/author_audit.py --label before --model gemma4:e4b
    # change the prompt under test, restart the reasoner
    python3 scripts/author_audit.py --label after  --model claude-haiku-4-5-20251001
    python3 scripts/author_audit.py --report before after

Drafts are cached under runs/author-audit/<label>/<model>/<id>-<n>/ (the
first SL, the final SL, and every intermediate); delete a folder to redraft.
`--report` reads cached result.json files only. The local reasoner limits
`/author-sl` to 10 calls a minute, so `--pace` (seconds between calls)
defaults to 7. Requires the `bert` binary (`cargo build -p bert-cli`).
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
RUNS = REPO / "runs" / "author-audit"
GSR = "http://localhost:5010"
LENS = "mobus"
MODE = "Operational"  # MODE_BY_LENS[Mobus], web/src/review.ts
PARSE_HEALS = 2       # draftSlWithRetry's cap
KERNEL_HEALS = 1      # #377 M1: one kernel pass

# The symposium's own protocols plus two controls (session 2026-09-08,
# coauthor-depth-m1-m2). The talk and the rig share fixtures on purpose.
FIXTURES = [
    ("hand-washing", "hand-washing at the meso level: a clinic ward where staff wash between patient contacts"),
    ("tcp-http", "the TCP/HTTP stack: an HTTP client and server over a TCP sender and receiver"),
    ("bitcoin-retarget", "Bitcoin's difficulty adjustment: miners, the chain, and the retarget rule holding ten-minute blocks"),
    ("nostr", "a Nostr client publishing to a relay"),
    ("aquarium", "an aquarium"),
    ("thermostat", "a wall thermostat controlling a furnace"),
]


def find_bert(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit)
    for candidate in (REPO / "target/debug/bert", REPO / "target/release/bert"):
        if candidate.exists():
            return candidate
    found = shutil.which("bert")
    if found:
        return Path(found)
    sys.exit("bert binary not found; build with `cargo build -p bert-cli --bin bert` or pass --bert")


# --- the reasoner -----------------------------------------------------------


def post(base: str, path: str, payload: dict, timeout: int) -> dict:
    req = urllib.request.Request(base + path, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def ask(base: str, description: str, model: str, timeout: int,
        prior_sl: str = "", errors: str = "") -> tuple[str, str, int]:
    payload = {"description": description, "model": model, "lens": LENS,
               "prior_sl": prior_sl or None, "errors": errors or None,
               "user_name": "author-audit"}
    try:
        body = post(base, "/author-sl", payload, timeout)
    except urllib.error.HTTPError as e:
        if e.code != 429:
            raise
        # The route's per-minute ceiling; wait it out once rather than lose the draw.
        time.sleep(int(e.headers.get("Retry-After", "60")) + 1)
        body = post(base, "/author-sl", payload, timeout)
    sl = str(body.get("sl", ""))
    if len(sl.strip().splitlines()) < 3:
        raise ValueError(f"truncated draft ({len(sl.strip())} chars)")
    return sl, str(body.get("model", model)), int(body.get("latency_ms") or 0)


# --- the kernel -------------------------------------------------------------


def bert_json(bert: Path, args: list[str], sl: str) -> tuple[dict | None, int]:
    p = subprocess.run([str(bert), *args, "-"], input=sl, capture_output=True, text=True)
    try:
        return json.loads(p.stdout), p.returncode
    except json.JSONDecodeError:
        return None, p.returncode


def compile_sl(bert: Path, sl: str) -> tuple[dict | None, list[dict]]:
    """(model, []) on success; (None, faults) when the text is not a model."""
    out, code = bert_json(bert, ["compile"], sl)
    if code == 0 and out is not None:
        return out, []
    return None, (out or {}).get("errors", [{"line": 0, "message": "compile failed"}])


def verdict(bert: Path, sl: str) -> list[dict]:
    out, _ = bert_json(bert, ["verdict", "--lens", LENS], sl)
    return ((out or {}).get("validation") or {}).get("issues", [])


def parse_faults_text(faults: list[dict]) -> str:
    return "\n".join(f"line {f.get('line', 0)}: {f.get('message', '')}" for f in faults)


def kernel_brief(errors: list[dict]) -> str:
    """The same text `kernelFindingsBrief` (web/src/coauthor.ts) sends: the
    lens, the mode, the count, then each finding's own message."""
    n = len(errors)
    head = f"The kernel reads this model under Mobus, {MODE} mode. {n} error{'' if n == 1 else 's'}."
    return head + "\n" + "\n".join(f"- Error at {e.get('location', '?')}: {e.get('message', '')}" for e in errors)


# --- the score --------------------------------------------------------------


def score(model: dict | None, issues: list[dict]) -> dict:
    """Counts over the compiled model and the verdict. Every field is either
    read straight off a kernel structure or is a count over such fields."""
    if model is None:
        return {"compiled": False}
    things = model.get("things", [])
    rels = model.get("relations", [])
    by_id = {t["id"]: t for t in things}
    comps = [t for t in things if t.get("role") == "Component"]
    env = [t for t in things if t.get("role") == "Environment"]
    touched: set[int] = set()
    for r in rels:
        touched.add(r["a"])
        touched.add(r["b"])

    def is_env(i: int) -> bool:
        return by_id.get(i, {}).get("role") == "Environment"

    def is_comp(i: int) -> bool:
        return by_id.get(i, {}).get("role") == "Component"

    energy_in = any(r.get("kind") == "Energy" and is_env(r["a"]) and is_comp(r["b"]) for r in rels)
    output_out = any(is_comp(r["a"]) and is_env(r["b"]) for r in rels)
    primitive = [c for c in comps if c.get("primitive")]
    complex_ = [c for c in comps if not c.get("primitive")]
    doors = [c for c in complex_ if (c.get("description") or "").strip()]
    errors = [i for i in issues if i.get("severity") == "Error"]
    codes = [i.get("code", "") for i in errors]
    return {
        "compiled": True,
        "refused": bool(errors),
        "errors": len(errors),
        "flowless_interface": codes.count("interface_carries_no_flow"),
        "crossing_without_interface": codes.count("crossing_flow_without_interface"),
        "components": len(comps),
        "env": len(env),
        "no_flows": sum(1 for c in comps if c["id"] not in touched),
        "interface": sum(1 for c in comps if c.get("interface")),
        "primitive": len(primitive),
        "complex": len(complex_),
        "doors": len(doors),
        "energy_in": energy_in,
        "output_out": output_out,
        "component_names": [c["name"] for c in comps],
        "complex_names": [c["name"] for c in complex_],
    }


# --- one draw ---------------------------------------------------------------


def draw(bert: Path, base: str, model: str, fixture_id: str, text: str, n: int,
         out: Path, timeout: int, pace: float) -> dict:
    folder = out / f"{fixture_id}-{n}"
    result_path = folder / "draw.json"
    if result_path.exists():
        return json.loads(result_path.read_text())
    folder.mkdir(parents=True, exist_ok=True)

    asks: list[dict] = []
    answered = model

    def one(prior_sl: str = "", errors: str = "", reason: str = "first") -> str:
        nonlocal answered
        if asks:
            time.sleep(pace)
        sl, answered, ms = ask(base, text, model, timeout, prior_sl, errors)
        (folder / f"{len(asks)}-{reason}.sl").write_text(sl)
        asks.append({"reason": reason, "model": answered, "latency_ms": ms})
        return sl

    sl = one()
    first_sl = sl
    parse_heals = 0
    kernel_heals = 0
    first_score: dict | None = None
    while True:
        compiled, faults = compile_sl(bert, sl)
        if compiled is None:
            if first_score is None:
                first_score = {"compiled": False}
            if parse_heals >= PARSE_HEALS:
                break
            parse_heals += 1
            sl = one(sl, parse_faults_text(faults), f"parse-heal-{parse_heals}")
            continue
        issues = verdict(bert, sl)
        s = score(compiled, issues)
        if first_score is None:
            first_score = s
        errors = [i for i in issues if i.get("severity") == "Error"]
        if errors and kernel_heals < KERNEL_HEALS:
            kernel_heals += 1
            sl = one(sl, kernel_brief(errors), f"kernel-heal-{kernel_heals}")
            continue
        break

    compiled, _ = compile_sl(bert, sl)
    final_score = score(compiled, verdict(bert, sl)) if compiled is not None else {"compiled": False}
    row = {
        "id": fixture_id, "draw": n, "model": answered, "requested": model,
        "asks": asks, "parse_heals": parse_heals, "kernel_heals": kernel_heals,
        "first": first_score, "final": final_score,
        "first_sl": first_sl, "final_sl": sl,
    }
    result_path.write_text(json.dumps(row, indent=2))
    return row


def run(label: str, model: str, draws: int, bert: Path, base: str, timeout: int, pace: float,
        fixtures: list[tuple[str, str]]) -> None:
    out = RUNS / label / model.replace("/", "_").replace(":", "_")
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for fixture_id, text in fixtures:
        for n in range(1, draws + 1):
            try:
                row = draw(bert, base, model, fixture_id, text, n, out, timeout, pace)
            except (urllib.error.URLError, TimeoutError, OSError, ValueError) as e:
                print(f"  {fixture_id} #{n}: draft failed ({e})", flush=True)
                continue
            f, g = row["first"], row["final"]
            state = lambda s: ("no-compile" if not s.get("compiled") else "refused" if s.get("refused") else "clean")
            print(f"  {fixture_id:<18} #{n}  {state(f):<10} -> {state(g):<10}"
                  f"  heals p{row['parse_heals']} k{row['kernel_heals']}  by {row['model']}", flush=True)
            rows.append(row)
            time.sleep(pace)
    (out / "result.json").write_text(json.dumps({"label": label, "model": model, "rows": rows}, indent=2))
    summarize(label, model, rows)


# --- the table --------------------------------------------------------------


def summarize(label: str, model: str, rows: list[dict]) -> None:
    def col(key: str):
        return [r[key] for r in rows]

    def rate(scores: list[dict], pred) -> str:
        pool = [s for s in scores if s.get("compiled")]
        if not pool:
            return "  -"
        return f"{sum(1 for s in pool if pred(s))}/{len(pool)}"

    def total(scores: list[dict], key: str) -> int:
        return sum(s.get(key, 0) for s in scores if s.get("compiled"))

    def share(scores: list[dict], num: str, den: str) -> str:
        n = total(scores, num)
        d = total(scores, den)
        return f"{n}/{d}" + (f" ({100 * n / d:.0f}%)" if d else "")

    first, final = col("first"), col("final")
    print(f"\n{label} / {model}   ({len(rows)} draws over {len({r['id'] for r in rows})} fixtures)")
    print(f"  {'':<34}{'first draft':>14}{'after loop':>14}")
    line = lambda name, a, b: print(f"  {name:<34}{a:>14}{b:>14}")
    line("did not compile", f"{sum(1 for s in first if not s.get('compiled'))}/{len(first)}",
         f"{sum(1 for s in final if not s.get('compiled'))}/{len(final)}")
    line("kernel refused (Mobus, Operational)", rate(first, lambda s: s.get("refused")), rate(final, lambda s: s.get("refused")))
    line("flowless interface stamps", str(total(first, "flowless_interface")), str(total(final, "flowless_interface")))
    line("crossings without an interface", str(total(first, "crossing_without_interface")), str(total(final, "crossing_without_interface")))
    line("components with no flows", str(total(first, "no_flows")), str(total(final, "no_flows")))
    line("interface stamps / components", share(first, "interface", "components"), share(final, "interface", "components"))
    line("primitive / components", share(first, "primitive", "components"), share(final, "primitive", "components"))
    line("description doors / complex", share(first, "doors", "complex"), share(final, "doors", "complex"))
    line("energy input present", rate(first, lambda s: s.get("energy_in")), rate(final, lambda s: s.get("energy_in")))
    line("output to a sink present", rate(first, lambda s: s.get("output_out")), rate(final, lambda s: s.get("output_out")))
    line("parse heals / kernel heals", f"{sum(col('parse_heals'))} / {sum(col('kernel_heals'))}", "")
    for r in rows:
        f, g = r["first"], r["final"]
        if not g.get("compiled"):
            tail = "did not compile"
        else:
            tail = (f"{g['components']} comps, {g['primitive']} primitive, {g['doors']}/{g['complex']} doors, "
                    f"{'energy in' if g['energy_in'] else 'NO energy in'}, "
                    f"{'output out' if g['output_out'] else 'NO output'}"
                    + (f"; complex: {', '.join(g['complex_names'])}" if g["complex_names"] else ""))
        mark = "!" if (not g.get("compiled") or g.get("refused")) else " "
        print(f"   {mark} {r['id']:<18}#{r['draw']}  {tail}")


def report(labels: list[str]) -> None:
    for label in labels:
        for res in sorted((RUNS / label).glob("*/result.json")):
            data = json.loads(res.read_text())
            summarize(data["label"], data["model"], data["rows"])


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--label", help="before | after | any run name")
    ap.add_argument("--model", default="claude-haiku-4-5-20251001")
    ap.add_argument("--draws", type=int, default=3)
    ap.add_argument("--only", help="comma-separated fixture ids")
    ap.add_argument("--gsr", default=GSR)
    ap.add_argument("--bert")
    ap.add_argument("--timeout", type=int, default=600)
    ap.add_argument("--pace", type=float, default=7.0, help="seconds between reasoner calls")
    ap.add_argument("--report", nargs="*", help="summarize cached runs and exit")
    a = ap.parse_args(argv)
    if a.report is not None:
        report(a.report or sorted(p.name for p in RUNS.iterdir() if p.is_dir()))
        return 0
    if not a.label:
        ap.error("--label is required")
    fixtures = FIXTURES
    if a.only:
        keep = set(a.only.split(","))
        fixtures = [f for f in FIXTURES if f[0] in keep]
    run(a.label, a.model, a.draws, find_bert(a.bert), a.gsr, a.timeout, a.pace, fixtures)
    return 0


if __name__ == "__main__":
    sys.exit(main())
