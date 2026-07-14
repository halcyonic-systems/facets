"""Rung-3 demonstration: the enterprise channel on its own (slower) clock.

The dev channel (rung 2) runs monthly. The enterprise channel updates ANNUALLY —
Menlo survey points, real and un-interpolated. This builds an enterprise
allocation model forced with the Menlo shares at `every: 12` (annual over a
monthly base tick): the shares zero-order-hold for 12 ticks, then step. It
demonstrates the tool's per-channel Δt (Mobus Δt_{i,l}) on real data — NOT a fit.

Data honesty: only the years the Menlo report states explicitly (2023, 2025 for
all four providers here); no fabricated midpoints. The held-between value is the
last real measured point (zero-order hold), per the rung-3 conditions.
"""
import csv
import json
from pathlib import Path

DATA = Path.home() / "Documents/bert-lenses/data"
OUT = Path.home() / "Documents/bert-lenses/technical"

# Menlo enterprise-spend share (%) at the two endpoints the report states for all four.
PROVIDERS = [
    ("anthropic", "Anthropic", {2023: 12, 2025: 40}),
    ("openai", "OpenAI", {2023: 50, 2025: 27}),
    ("google", "Google", {2023: 7, 2025: 21}),
    ("open_weights", "Open-weights", {2023: 19, 2025: 11}),
]
YEARS = [2023, 2025]  # two real annual samples → the slow channel steps once
STRIDE = 12           # annual over a monthly base tick: Δt_enterprise = 12 × Δt_dev
NOMINAL_TOTAL = 100.0 # Menlo gives shares, not absolute tokens; total is nominal


def build():
    # --- generator spec: Enterprise demand -> Allocator[Splitting] -> providers ---
    spec = {
        "system": {"name": "LLM enterprise-channel allocation", "complexity": "Complex", "adaptable": True},
        "subsystems": [{"name": "Enterprise allocator", "primitive": "Splitting",
                        "description": "Splits enterprise demand by Menlo spend share (annual)"}],
        "sources": [{"name": "Enterprise demand", "description": "Total enterprise LLM spend (nominal)"}],
        "sinks": [{"name": disp, "description": f"{disp} enterprise share"} for _, disp, _ in PROVIDERS],
        "routing_table": (
            [{"interface": "ent_in", "connected_to": "Enterprise demand",
              "target_subsystem": "Enterprise allocator", "type": "Import", "has_processor": False}]
            + [{"interface": f"{col}_out", "connected_to": disp,
                "target_subsystem": "Enterprise allocator", "type": "Export", "has_processor": False}
               for col, disp, _ in PROVIDERS]
        ),
        "internal_flows": [],
        "external_flows": (
            [{"interface": "ent_in", "name": "Enterprise demand routed",
              "substance": {"type": "Material", "sub_type": "spend"}, "usability": "Resource"}]
            + [{"interface": f"{col}_out", "name": f"{disp} enterprise allocation",
                "substance": {"type": "Material", "sub_type": "spend"}, "usability": "Resource"}
               for col, disp, _ in PROVIDERS]
        ),
    }
    (OUT / "rung3-enterprise-spec.json").write_text(json.dumps(spec, indent=2))

    # --- CSV: one row per annual sample (the slow channel's own data stream) ---
    csv_path = DATA / "rung3_enterprise.csv"
    with open(csv_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["year", "ent_total"] + [f"w_{col}" for col, _, _ in PROVIDERS])
        for y in YEARS:
            w.writerow([y, NOMINAL_TOTAL] + [pts[y] for _, _, pts in PROVIDERS])

    # --- manifest: force all, every=12 (annual), T = years * stride (monthly ticks) ---
    manifest = {
        "model": "technical/rung3-enterprise.json",
        "data": "data/rung3_enterprise.csv",
        "dt": 1.0,
        "t": float(len(YEARS) * STRIDE),  # 24 monthly ticks = 2 annual samples held 12 each
        "mapping": [
            {"column": "year", "as": "time"},
            {"column": "ent_total", "as": "flow", "element": "Enterprise demand routed",
             "unit": "spend", "force": True, "every": STRIDE},
        ] + [
            {"column": f"w_{col}", "as": "flow", "element": f"{disp} enterprise allocation",
             "unit": "weight", "force": True, "every": STRIDE}
            for col, disp, _ in PROVIDERS
        ],
    }
    (OUT / "rung3-enterprise-run.json").write_text(json.dumps(manifest, indent=2))
    return csv_path


if __name__ == "__main__":
    csv_path = build()
    print("spec:     ", OUT / "rung3-enterprise-spec.json")
    print("csv:      ", csv_path)
    print("manifest: ", OUT / "rung3-enterprise-run.json")
    print(f"\n{len(YEARS)} annual samples, stride {STRIDE} → {len(YEARS)*STRIDE} monthly ticks")
    print("Menlo enterprise shares (the slow channel, zero-order-held between):")
    for col, disp, pts in PROVIDERS:
        print(f"  {disp:14s} " + "  ".join(f"{y}:{pts[y]:>2}%" for y in YEARS))
