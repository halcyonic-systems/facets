"""Rung-3 staircase: the second clock, made VISIBLE.

Unlike rung3_enterprise.py (which splits demand by weights — the step is real but
hidden in weight-forced flows the run panel skips), this forces each provider's
Menlo enterprise share DIRECTLY as a stepping series on its own annual clock
(every: 12). Each flow is a real charted quantity (unit "%share", not "weight"),
so the run panel plots it: flat for 12 ticks, then a step — the zero-order-hold
annual clock as a staircase. Executed == actual (forced), so both trace the
staircase over the flat declared mean.

Topology mirrors rung 1 (providers as sources → a channel), just forced on a
slow clock instead of monthly. Real Menlo endpoints (2023, 2025); no fill.
"""
import csv
import json
from pathlib import Path

DATA = Path.home() / "Documents/bert-lenses/data"
OUT = Path.home() / "Documents/bert-lenses/technical"

# Menlo enterprise-spend share (%) — real endpoints, the report's stated points.
PROVIDERS = [
    ("anthropic", "Anthropic", {2023: 12, 2025: 40}),  # rising
    ("openai", "OpenAI", {2023: 50, 2025: 27}),        # falling
    ("google", "Google", {2023: 7, 2025: 21}),
    ("open_weights", "Open-weights", {2023: 19, 2025: 11}),
]
YEARS = [2023, 2025]
STRIDE = 12  # annual over a monthly base tick — Δt_enterprise = 12 × Δt_dev


def build():
    spec = {
        "system": {"name": "LLM enterprise share (staircase)", "complexity": "Complex", "adaptable": True},
        "subsystems": [{"name": "Enterprise channel", "primitive": "Combining",
                        "description": "Aggregates provider enterprise share"}],
        "sources": [{"name": disp, "description": f"{disp} enterprise spend share"} for _, disp, _ in PROVIDERS],
        "sinks": [],
        "routing_table": [
            {"interface": f"{col}_in", "connected_to": disp,
             "target_subsystem": "Enterprise channel", "type": "Import", "has_processor": False}
            for col, disp, _ in PROVIDERS
        ],
        "internal_flows": [],
        "external_flows": [
            {"interface": f"{col}_in", "name": f"{disp} enterprise share",
             "substance": {"type": "Material", "sub_type": "share"}, "usability": "Resource"}
            for col, disp, _ in PROVIDERS
        ],
    }
    (OUT / "rung3-staircase-spec.json").write_text(json.dumps(spec, indent=2))

    csv_path = DATA / "rung3_staircase.csv"
    with open(csv_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["year"] + [f"{col}_share" for col, _, _ in PROVIDERS])
        for y in YEARS:
            w.writerow([y] + [pts[y] for _, _, pts in PROVIDERS])

    manifest = {
        "model": "technical/rung3-staircase.json",
        "data": "data/rung3_staircase.csv",
        "dt": 1.0,
        "t": float(len(YEARS) * STRIDE),  # 24 monthly ticks
        "mapping": [{"column": "year", "as": "time"}] + [
            # unit "%share" (NOT "weight") so the run panel CHARTS the staircase.
            {"column": f"{col}_share", "as": "flow", "element": f"{disp} enterprise share",
             "unit": "%share", "force": True, "every": STRIDE}
            for col, disp, _ in PROVIDERS
        ],
    }
    (OUT / "rung3-staircase-run.json").write_text(json.dumps(manifest, indent=2))
    return csv_path


if __name__ == "__main__":
    csv_path = build()
    print("spec:     ", OUT / "rung3-staircase-spec.json")
    print("csv:      ", csv_path)
    print("manifest: ", OUT / "rung3-staircase-run.json")
    print(f"\n{len(YEARS)} annual samples, stride {STRIDE} → {len(YEARS)*STRIDE} monthly ticks")
    print("Each provider's share holds 12 ticks, then STEPS — a visible staircase:")
    for _, disp, pts in PROVIDERS:
        arrow = "↑" if pts[YEARS[-1]] > pts[YEARS[0]] else "↓"
        print(f"  {disp:14s} {pts[2023]:>2}% → {pts[2025]:>2}%  {arrow}")
