# ── hal, the sovereign-AI harness — structural face ──────────────────
# hal is Halcyonic's local-model harness: a proxy that routes requests,
# a council that convenes multiple models to deliberate, a bench that
# measures model/tool performance, a fine-tune pipeline that trains
# LoRA adapters, and a homeostat — the measurement-and-regulation
# subsystem (bench + canary + guards + spec) that watches the harness's
# own transport health and gates it accordingly.
#
# One level of decomposition, one system of interest: hal. The point
# of this model is what it does NOT show. hal#40/#42 settled that
# homeostat is a **published subtree projection** of hal — hal keeps
# source-of-truth, homeostat.systems is a one-way, force-pushed mirror
# — not a subsystem promoted into an independent system. A promotion
# would sever Homeostat's bonds to Proxy/Bench into a second system's
# own composition boundary. A projection keeps every bond exactly
# where it is (endo, inside hal) and adds only an outward-facing,
# one-way publish — no flow returns from the mirror. That asymmetry
# (all real bonds stay internal; the only boundary-crossing edge is a
# one-way sink flow) is the one thing SL's flat kernel CAN say about
# projection-vs-promotion. What it cannot say is discussed below.

system "hal" : Concrete/Technical
domain "Sovereign-AI harness: routes, deliberates, measures, fine-tunes, and self-regulates local models"

level Structure

# ── Composition: hal's internal subsystems, one level down ───────────

# Proxy fans a caller's request out to whichever local model backend
# should serve it — the harness's single point of contact with the
# outside (both operators and the models it routes to).
component Proxy primitive Splitting interface

# Council convenes several models through the proxy and combines their
# takes into one deliberated verdict. Internal only — it never talks
# to a caller or a model directly, only through Proxy.
component Council primitive Combining

# Bench senses call outcomes flowing through the proxy and scores
# model/tool performance — hal's own benchmarking harness
# (benchmark.py / mlx-bench), distinct from homeostat's internal bench
# below, which probes transport health rather than model capability.
component Bench primitive Sensing

# The fine-tune pipeline combines a base model's weights with training
# data into a trained LoRA adapter, then hands the adapter back to the
# model store — the harness's only component that both reads from and
# writes back into the local-models environment.
component "Fine-tune Pipeline" primitive Combining interface

# Homeostat is the re-bounded measurement-and-regulation subsystem —
# bench + canary + guards + spec bundled as one thing at THIS level of
# resolution. It senses Proxy's real transport behavior and gates
# Proxy accordingly: Conant–Ashby's "every good regulator of a system
# must be a model of that system" — the guard machine contains a model
# of the transport loop it regulates, which is exactly how the guards
# catch what the proxy alone would not. Its only boundary crossing is
# the one-way publish out to the mirror site.
component Homeostat primitive Modulating interface

# ── Environment: who hal serves and what it routes to ────────────────

# The outside callers hal exists to serve — CLI, other Halcyonic apps,
# Shingai directly. Two-way: requests in, responses out.
environment Operators

# The local model backends (Ollama-served open-weight models) hal
# routes to and fine-tunes. Two-way: calls and base weights out,
# generations and tuned adapters back.
environment "Local Models"

# The published mirror — homeostat.systems / halcyonic-systems/homeostat
# — a one-way, force-pushed READ of homeostat's own subtree. Nothing
# flows back from here into hal; that one-directionality is the
# structural signature of "hal keeps SSOT" in this rendering.
sink "Published Mirror"

# ── Structure ─────────────────────────────────────────────────────────

flow Operators -> Proxy : informational "request"
flow Proxy -> Operators : informational "response"

flow Proxy -> "Local Models" : informational "model call"
flow "Local Models" -> Proxy : informational "generation"

flow Proxy -> Council : informational "proxy calls to convene"
flow Council -> Proxy : informational "convened verdict"

flow Proxy -> Bench : informational "call telemetry"
flow Bench -> "Fine-tune Pipeline" : informational "benchmark results"

flow "Local Models" -> "Fine-tune Pipeline" : informational "base weights"
flow "Fine-tune Pipeline" -> "Local Models" : informational "tuned LoRA adapter"

# The regulatory loop. This pair is ENDO under hal's single system of
# interest — both endpoints are inside hal's boundary. That is the
# expressivity wall this model exists to surface: the real 2026 defect
# (a transport bug) lived in what was, at the homeostat-as-its-own-SOI
# level, homeostat's EXOSTRUCTURE — its own boundary-facing coupling to
# hal's transport. Flattened into hal's one system of interest, that
# same coupling reads as an ordinary internal bond. The kernel has no
# construct for "this endo edge is exo one level down, at a subsystem
# that is itself only a view" — see the note below.
flow Proxy -> Homeostat : informational "transport telemetry"
flow Homeostat -> Proxy : informational "guard verdict" description "The gating signal: the guard's ruling on a transport, which the proxy applies rather than re-decides."

flow Homeostat -> "Published Mirror" : informational "published snapshot" description "The benchmark results and constraint spec as published — a one-way projection, never read back."

@lens bunge

# ── Why Bunge, not Mobus, for @lens ───────────────────────────────────
# Bunge's endo/exo split is the whole point of this model: hal's
# internal bonds (Proxy–Council, Proxy–Bench, Bench–FineTune, Proxy–
# Homeostat) are its endostructure; the single edge that leaves hal's
# boundary (Homeostat -> Published Mirror) is its exostructure. That is
# precisely the vocabulary the intent asks this model to demonstrate
# ("the transport bug lived in the exostructure") and precisely what
# broke when flattened to one SOI, above. Mobus's governance hierarchy
# is a real alternative reading of the SAME structure: Proxy as the
# level-boundary interface, Homeostat as the regulatory subsystem
# feeding back into the level it governs, Council/Bench/Fine-tune as
# sibling work processes at the same echelon — worth a second pass in
# the Mobus lens on canvas, not stamped here because the endo/exo
# story is the one this file is built to carry.

# ── Bunge Def 1.1 (aggregate-not-system) check ────────────────────────
# Five real component-component bonds exist beyond mere co-location:
# Proxy<->Council, Proxy<->Bench, Bench->FineTune, Proxy<->Homeostat.
# None are declared `mere` — every one is a genuine functional coupling
# (a component performing its primitive ON the other's output), so
# this is a system by Def 1.1, not an aggregate.
