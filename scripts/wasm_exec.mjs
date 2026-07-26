// The wasm-exec gate: run the shipped kernel package, in a JS runtime, on real
// content — the one thing no other gate in this repo did (#233).
//
// What was missing and why it matters. `cargo test` runs the NATIVE build, so
// it never marshals a value across the wasm edge. `vitest` runs in `environment:
// "node"` against COMMITTED JSON fixtures, so it validates what Rust *wrote to
// disk*, never what JS *receives*. Between those two gates sits serde-wasm-
// bindgen, the one component with no coverage at all — and the face reads its
// output for every verdict on screen. This harness closes that: it loads
// `crates/bert-lenses-kernel/pkg` the way the app loads it and drives real
// exports over the shipped corpus.
//
// Run:  node scripts/wasm_exec.mjs [--pkg <dir>] [--probe <dir>]
// or:   just wasm-exec
//
// TWO REAL DIVERGENCES this harness found on its first run, both invisible to
// every other gate, both allowed here BY NAME rather than papered over:
//
//   1. f32 widens. `boundary_props.porosity` is `0.35` in the committed fixture
//      (Rust prints the f32) and `0.3499999940395355` at the boundary (JS has
//      only f64). Numerically the same value; textually not. Compared with a
//      relative tolerance, and every use is counted and printed.
//   2. `Option::None` arrives as `undefined`, not `null`. The fixtures say
//      `"channel": null`; serde-wasm-bindgen hands the face `undefined`. The TS
//      mirrors declare `| null`, so a `=== null` test on an optional kernel
//      field would hold in the fixture suite and fail in the browser. No face
//      code does that today — this is a live trap, not a live bug — and the
//      point of the gate is that it is now a NAMED trap with a number beside it.
//
// A tolerance that is not counted is a tolerance that grows. The counts print on
// every run; if one moves, something changed at the boundary.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// ---- argv -------------------------------------------------------------------

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
}
const PKG = flag("--pkg", "crates/bert-lenses-kernel/pkg");
const PROBE = flag("--probe", null);

// ---- assertions -------------------------------------------------------------

let checks = 0;
const failures = [];

function ok(cond, what) {
  checks++;
  if (!cond) failures.push(what);
}

function fail(what) {
  checks++;
  failures.push(what);
}

// ---- structural comparison --------------------------------------------------

const allowances = { f32: 0, undefinedForNull: 0 };

/** Every place `got` (through wasm) and `want` (the committed fixture) differ,
 *  after the two named marshaling allowances above. Empty = agreement. */
function differences(got, want, path = "", out = []) {
  if (got === want) return out;

  // Allowance 1: f32 → f64 widening.
  if (typeof got === "number" && typeof want === "number") {
    const scale = Math.max(1, Math.abs(got), Math.abs(want));
    if (Math.abs(got - want) <= 1e-6 * scale) {
      if (got !== want) allowances.f32++;
      return out;
    }
    out.push(`${path}: ${got} ≠ ${want}`);
    return out;
  }

  // Allowance 2: Option::None crosses as undefined where the fixture says null.
  if (got === undefined && want === null) {
    allowances.undefinedForNull++;
    return out;
  }

  if (got && want && typeof got === "object" && typeof want === "object") {
    if (Array.isArray(got) !== Array.isArray(want)) {
      out.push(`${path}: array/object mismatch`);
      return out;
    }
    for (const k of new Set([...Object.keys(got), ...Object.keys(want)])) {
      differences(got?.[k], want?.[k], path ? `${path}.${k}` : k, out);
    }
    return out;
  }

  out.push(`${path}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  return out;
}

/** Deep equality with the same allowances — for wasm-vs-wasm round trips. */
function same(a, b) {
  return differences(a, b).length === 0;
}

// ---- loading the shipped package -------------------------------------------

/** Instantiate a wasm-pack `--target web` package under node, exactly as the
 *  browser does minus the fetch: the same glue JS, the same `.wasm` bytes, the
 *  same generated bindings the app imports. Nothing is stubbed. */
async function load(dir) {
  const glue = join(ROOT, dir, "bert_lenses_kernel.js");
  const wasm = join(ROOT, dir, "bert_lenses_kernel_bg.wasm");
  for (const p of [glue, wasm]) {
    try {
      statSync(p);
    } catch {
      console.error(
        `wasm-exec: missing ${relative(ROOT, p)} — build it first:\n` +
          `  cd crates/bert-lenses-kernel && wasm-pack build --target web --out-dir ${dir.split("/").pop()}`,
      );
      process.exit(2);
    }
  }
  // A fresh module instance per package: the generated `__wbg_init` returns
  // early once `wasm` is bound, so two packages in one process need two
  // module identities.
  const mod = await import(`${glue}?pkg=${encodeURIComponent(dir)}`);
  await mod.default({ module_or_path: readFileSync(wasm) });
  return mod;
}

function read(p) {
  return readFileSync(join(ROOT, p), "utf8");
}

function fixture(name) {
  return JSON.parse(read(`fixtures/contract/${name}.json`));
}

function slFiles(dir) {
  const out = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...slFiles(p));
    else if (entry.name.endsWith(".sl")) out.push(p);
  }
  return out.sort();
}

// ---- A. the fixtures, recomputed through wasm --------------------------------

/** The committed contract fixtures are written by NATIVE Rust tests. This
 *  recomputes each one from the same input through the real wasm package and
 *  compares. Until now nothing checked that the two agree — a serde attribute
 *  that changes only the wasm representation (a map that becomes a JS `Map`, a
 *  u64 that becomes a `BigInt`, a flattened enum that loses its tag) would pass
 *  `cargo test` and pass `vitest` and reach the user broken. */
function fixturesThroughWasm(k) {
  const canvas = fixture("canvas_model");
  const json = JSON.stringify(canvas);

  const cases = [
    ["canvas_analysis", () => k.analyze_canvas(json)],
    ["lens_facts", () => k.lens_facts(json)],
    ["lens_description_klir", () => k.describe(json, "Klir")],
    ["lens_description_bunge", () => k.describe(json, "Bunge")],
    ["lens_description_mobus", () => k.describe(json, "Mobus")],
  ];

  for (const [name, compute] of cases) {
    let got;
    try {
      got = compute();
    } catch (e) {
      fail(`fixture ${name}: the boundary threw — ${e.message}`);
      continue;
    }
    const diff = differences(got, fixture(name));
    ok(diff.length === 0, `fixture ${name} drifted at the boundary: ${diff.join("; ")}`);
  }

  // The archive seam (#140): persist → reopen is the identity on the canvas
  // model, through wasm, not merely in Rust.
  const reopened = k.open_model(k.write_archive(json));
  const diff = differences(reopened, canvas);
  ok(diff.length === 0, `archive round-trip lost content: ${diff.join("; ")}`);
}

// ---- B. the shipped corpus, through wasm ------------------------------------

/** Every `.sl` file the app can put on screen, driven through the boundary the
 *  app uses. A file under `teaching/` whose name says `error` must be REFUSED —
 *  a corpus entry that teaches a refusal and no longer refuses is as broken as
 *  one that fails to parse. */
function corpusThroughWasm(k) {
  const files = [...slFiles("assets/corpus"), ...slFiles("assets/examples"), ...slFiles("fixtures/sl")];
  ok(files.length >= 30, `expected the shipped SL corpus, found ${files.length} files`);

  let refusals = 0;
  for (const file of files) {
    const text = read(file);
    const teachesRefusal = /\berror\b/.test(file);

    let parsed;
    try {
      parsed = k.compile_sl(text);
    } catch (e) {
      fail(`${file}: compile_sl threw instead of returning a result — ${e.message}`);
      continue;
    }

    if (parsed.errors) {
      // A parse fault is a legal outcome only for a file that teaches one, and
      // it must name its faults.
      ok(teachesRefusal, `${file}: refused to parse — ${JSON.stringify(parsed.errors).slice(0, 200)}`);
      ok(parsed.errors.length > 0, `${file}: refused with an empty fault list`);
      refusals++;
      continue;
    }

    const model = parsed.ok;
    const json = JSON.stringify(model);

    // The author view: one kernel call, computed in wasm, shaped as the face reads it.
    const analysis = k.analyze_canvas(json);
    ok(analysis && analysis.validation, `${file}: analyze_canvas returned no validation`);
    if (teachesRefusal) {
      const errs = (analysis.validation.issues ?? []).filter((i) => i.severity === "Error");
      ok(errs.length > 0, `${file}: teaches a refusal but the kernel raised no Error`);
      refusals++;
    }

    // Persist → reopen → re-emit → recompile. Four boundary crossings; the
    // model must survive all of them unchanged.
    const reopened = k.open_model(k.write_archive(json));
    ok(same(reopened, model), `${file}: archive round-trip changed the model`);

    let emitted;
    try {
      emitted = k.emit_sl(json);
    } catch (e) {
      fail(`${file}: emit_sl threw — ${e.message}`);
      continue;
    }
    const recompiled = k.compile_sl(emitted);
    ok(!recompiled.errors, `${file}: its own emitted SL does not parse`);
    if (recompiled.ok) {
      // emit∘parse canonicalizes, so compare the canonical fixed point.
      const twice = k.emit_sl(JSON.stringify(recompiled.ok));
      ok(twice === emitted, `${file}: emit∘parse is not idempotent`);
    }
  }
  ok(refusals > 0, "the corpus contains no refusal case — the gate can only pass");
  return files.length;
}

// ---- C. the executable path -------------------------------------------------

/** A run is the deepest path across the edge: model JSON in, a projection, a
 *  circuit, and a numeric trace back out. Conservation is the assertion — a
 *  marshaling fault that mangled the trace would not balance. */
function runThroughWasm(k) {
  const modelJson = read("assets/models/runnable-sample.json");

  const report = k.validate(modelJson);
  ok(Array.isArray(report.issues), "validate did not return an issue list");

  const gate = k.validate_operational(modelJson);
  ok(gate.ok !== undefined, `the runnable sample is not executable: ${JSON.stringify(gate).slice(0, 200)}`);
  if (gate.errors) return;

  const run = k.run(modelJson, 0.5, 20);
  ok(run.dt === 0.5, `run recorded Δt = ${run.dt}, not the 0.5 it was given`);
  ok(run.history.length === 20, `run recorded ${run.history.length} ticks, not 20`);
  ok(run.history.every((row) => row.every(Number.isFinite)), "the run trace carries a non-finite number");
  ok(
    Math.abs(run.final_balance) < 1e-6,
    `the run does not conserve across the edge: residual ${run.final_balance}`,
  );
  ok(run.ledger_history.length === run.history.length, "the ledger and the trace disagree on length");
}

// ---- D. the refusal contract ------------------------------------------------

/** API.md allows exactly one failure mode: a `JsError` naming the fault. This
 *  asserts the message the FACE receives is the kernel's own sentence — the
 *  thing that stops being true the moment a boundary function panics instead,
 *  when the face gets `unreachable` and nothing else. */
function refusalsThroughWasm(k) {
  const cases = [
    ["open_model on junk", () => k.open_model("{not json"), /model file|JSON/i],
    ["project on junk", () => k.project("[]"), /invalid canvas model/i],
    ["describe with an unknown lens", () => k.describe(JSON.stringify(fixture("canvas_model")), "Aristotle"), /unknown lens/i],
    ["run on an unparseable model", () => k.run("{", 1, 1), /invalid model JSON/i],
  ];

  for (const [what, invoke, shape] of cases) {
    try {
      invoke();
      fail(`${what}: returned instead of refusing`);
    } catch (e) {
      ok(!(e instanceof WebAssembly.RuntimeError), `${what}: trapped instead of throwing a JsError`);
      ok(shape.test(e.message ?? ""), `${what}: refused with an unrecognizable message — ${e.message}`);
    }
  }
}

// ---- E. the panic path (probe package only) ---------------------------------

/** What a Rust panic actually does to the shipped kernel — measured, not
 *  assumed. Runs only against a package built with `--features panic-probe`,
 *  which no release build has. Two claims are under test:
 *
 *   1. The panic hook installed in `lib.rs` puts the panic's message and Rust
 *      source location on `console.error` before the trap. Without it the face
 *      sees `RuntimeError: unreachable` and the message is discarded.
 *   2. What the instance does afterwards. This boundary holds no state between
 *      calls — every export deserializes its whole input — so a trap unwinds
 *      one call and leaves the module able to serve the next. Asserted here on
 *      50 consecutive traps rather than argued: the same analysis computed
 *      before and after must be identical. That is the evidence behind the
 *      error boundary's copy; if it ever stops holding, this fails and the copy
 *      has to change again. */
function panicPathThroughWasm(k) {
  ok(typeof k.__trap_probe === "function", "the probe package has no __trap_probe — it was built without the feature");
  if (typeof k.__trap_probe !== "function") return;

  const canvas = JSON.stringify(fixture("canvas_model"));
  const before = JSON.stringify(k.analyze_canvas(canvas));

  const logged = [];
  const real = console.error;
  console.error = (...args) => logged.push(args.join(" "));
  let traps = 0;
  let firstError = null;
  try {
    for (let i = 0; i < 50; i++) {
      try {
        k.__trap_probe(canvas);
        break;
      } catch (e) {
        traps++;
        firstError ??= e;
      }
    }
  } finally {
    console.error = real;
  }

  ok(traps === 50, `the probe panicked ${traps} times out of 50`);
  ok(firstError instanceof WebAssembly.RuntimeError, `a panic reached JS as ${firstError?.constructor?.name}, not a wasm trap`);
  ok(
    logged.some((line) => /panicked at/.test(line) && /panic-probe/.test(line)),
    "the panic message did not reach console.error — the panic hook is not installed",
  );
  ok(
    logged.some((line) => /lib\.rs/.test(line)),
    "the logged panic names no Rust source location",
  );

  const after = JSON.stringify(k.analyze_canvas(canvas));
  ok(before === after, "the kernel answers differently after a trap — the instance IS poisoned, and the error-boundary copy must say so");
  ok(same(k.open_model(k.write_archive(canvas)), fixture("canvas_model")), "the archive seam broke after a trap");
  try {
    k.open_model("{");
    fail("after a trap the boundary stopped refusing junk");
  } catch (e) {
    ok(!(e instanceof WebAssembly.RuntimeError), "after a trap a contractual refusal became a trap");
  }
}

// ---- main -------------------------------------------------------------------

const kernel = await load(PKG);
console.log(`wasm-exec: loaded ${PKG}`);

fixturesThroughWasm(kernel);
const corpusSize = corpusThroughWasm(kernel);
runThroughWasm(kernel);
refusalsThroughWasm(kernel);
console.log(`wasm-exec: ${corpusSize} corpus files through the boundary`);

if (PROBE) {
  const probe = await load(PROBE);
  console.log(`wasm-exec: loaded ${PROBE} (panic probe)`);
  panicPathThroughWasm(probe);
} else {
  console.log("wasm-exec: no --probe package given, the panic path was NOT exercised");
}

console.log(
  `wasm-exec: marshaling allowances used — f32 widening ${allowances.f32}, undefined-for-null ${allowances.undefinedForNull}`,
);

if (failures.length > 0) {
  console.error(`\nwasm-exec: ${failures.length} of ${checks} checks FAILED\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`wasm-exec: ${checks} checks passed`);
