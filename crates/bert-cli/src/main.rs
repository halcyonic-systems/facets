//! `bert` — the headless door onto the kernel.
//!
//! Every question this answers was already a library call before this binary
//! existed (`sl::parse_sl_full`, `lenses::analyze`, `lenses::describe`,
//! `operational::validate_operational`, `RecordedRun`). What was missing was a
//! way to ask from a shell, so answering "what does the kernel say about this
//! file" cost a browser or a throwaway test. This is only the door.
//!
//! It is therefore a CONSUMER of the crates, never a second implementation of
//! them. Nothing in this crate decides anything about systems: it parses
//! arguments, calls the truth, and serializes what comes back. If a verdict is
//! ever computed here, that is the same bug as a verdict computed in JS.
//!
//! Two rules make it usable from a script:
//!
//! - **stdout is the machine answer, stderr is for people.** stdout carries
//!   JSON and only JSON, so `bert verdict m.sl | jq` never has to skip a banner
//!   line. Human-readable diagnostics — the line-anchored parse faults, the
//!   refusal summary — go to stderr, where a pipeline ignores them.
//! - **the exit code carries the kind of failure**, so a check can branch
//!   without parsing anything. See [`exit`].

use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use clap::{Parser, Subcommand, ValueEnum};
use serde::Serialize;

use bert_canvas::canvas::{project, CanvasModel, EnvKind, Lens, Role};
use bert_canvas::lenses::{analyze, describe};
use bert_core::validate::Severity;

mod input;

use input::LoadError;

/// What a `bert` exit status means. A shell check branches on these; nothing
/// downstream should have to read a message to find out what went wrong.
///
/// The split that matters is 3 against 4: a file that did not compile is the
/// author's typo, and a file that compiled into something the kernel refuses is
/// a claim about the system. Collapsing them would make `bert verdict` unable
/// to tell "you mistyped `flwo`" from "this model is not a system", which is
/// the distinction the whole instrument exists to draw.
mod exit {
    /// The answer is on stdout.
    pub const OK: u8 = 0;
    /// Something failed that is neither the input's fault nor the kernel's —
    /// an unreadable file, a serializer that would not serialize.
    pub const INTERNAL: u8 = 1;
    /// Bad arguments. Produced by clap itself, listed here so the table is
    /// complete and so nothing else claims the code.
    pub const _USAGE: u8 = 2;
    /// The input did not compile, or is not a model file. Faults are on stdout
    /// as JSON and line-anchored on stderr.
    pub const FAULT: u8 = 3;
    /// The kernel refused: a validation error at the lens's mode, a model that
    /// does not project to something executable, or a run with no step.
    pub const REFUSED: u8 = 4;
}

#[derive(Parser)]
#[command(
    name = "bert",
    version,
    about = "Ask the bert-lenses kernel about a model, from a shell.",
    long_about = "Compile SL, read the verdict under any lens, typeset the formal object, \
                  run the trajectory, or read the layout — as JSON on stdout.\n\n\
                  Exit codes: 0 ok · 1 internal · 2 usage · 3 the input did not compile \
                  · 4 the kernel refused."
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

/// A file argument is a path, or `-` for stdin. `.sl` compiles; anything else
/// is opened as a stored model (neutral archive or legacy `WorldModel`).
#[derive(Subcommand)]
enum Command {
    /// Compile SL into the canvas model it becomes.
    Compile {
        /// The `.sl` file to compile, or `-` for stdin.
        file: PathBuf,
    },
    /// What the kernel says about the model, under a lens.
    ///
    /// Exits 4 when the verdict carries an error, so `bert verdict m.sl` is a
    /// check. `--lens` reads the model under a lens it is not pinned to:
    /// `lenses::analyze` takes the lens explicitly and ignores `model.lens`,
    /// which is the cross-lens door this subcommand exists to open.
    Verdict {
        /// The model file, or `-` for stdin.
        file: PathBuf,
        /// Read under this lens instead of the model's own.
        #[arg(long, value_enum)]
        lens: Option<LensArg>,
    },
    /// The formal object the tradition writes — Klir (T,R), Bunge ⟨C,E,S⟩,
    /// Mobus's 8-tuple. The same `describe` the formal panel typesets.
    Describe {
        /// The model file, or `-` for stdin.
        file: PathBuf,
        /// Typeset under this lens instead of the model's own.
        #[arg(long, value_enum)]
        lens: Option<LensArg>,
    },
    /// Run the model and print the trajectory, or why it cannot run.
    ///
    /// `--t` is a horizon in model time and `--dt` the step, because that is
    /// the form the engine's own precondition guards (`RecordedRun::record_over`
    /// refuses a Δt that is not a step, and a wiring loop with no stock on it).
    /// The tick count is `round(t / dt)`, so the defaults are 30 ticks.
    Run {
        /// The model file, or `-` for stdin.
        file: PathBuf,
        /// The horizon T, in model time.
        #[arg(long, default_value_t = 30.0)]
        t: f64,
        /// The step size Δt.
        #[arg(long, default_value_t = 1.0)]
        dt: f64,
    },
    /// Where the nodes sit, so a layout regression is one shell line.
    ///
    /// Positions only. Whether they are *right* is a question for the caller
    /// (`jq`, a test) — deciding it here would be systems logic in the door.
    Layout {
        /// The model file, or `-` for stdin.
        file: PathBuf,
    },
}

#[derive(Copy, Clone, ValueEnum)]
enum LensArg {
    Klir,
    Bunge,
    Mobus,
}

impl From<LensArg> for Lens {
    fn from(l: LensArg) -> Lens {
        match l {
            LensArg::Klir => Lens::Klir,
            LensArg::Bunge => Lens::Bunge,
            LensArg::Mobus => Lens::Mobus,
        }
    }
}

/// One node's place on the canvas — the `layout` answer, and a straight
/// selection of fields the model already carries. `role` and `env_kind` ride
/// along because the layout questions worth asking are about them ("is every
/// source left of every sink"), and re-joining them from a second `compile`
/// call would be the caller's work for no reason.
#[derive(Serialize)]
struct NodePosition {
    id: u64,
    name: String,
    role: Role,
    env_kind: EnvKind,
    x: f32,
    y: f32,
}

#[derive(Serialize)]
struct LayoutReport {
    nodes: Vec<NodePosition>,
}

/// The tagged failure shapes. Both mirror what the wasm boundary already
/// returns for the same conditions (`SlOutcome::Errors`,
/// `OperationalOutcome::Errors`), so a reader that knows one knows the other.
#[derive(Serialize)]
struct Faults<'a> {
    errors: &'a [bert_canvas::sl::SlError],
}

#[derive(Serialize)]
struct NotExecutable<'a> {
    errors: &'a [bert_core::operational::OperationalError],
}

/// A run that the engine refused before stepping — the wiring has a loop with
/// no stock on it, or `(Δt, T)` name no run. One reason, in the engine's words.
#[derive(Serialize)]
struct RunRefused<'a> {
    refused: &'a str,
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    ExitCode::from(run(cli.command))
}

/// Write `value` to stdout as one line of JSON.
///
/// Compact rather than pretty: the answer is for a machine, `jq` is the human
/// path, and a run's history pretty-printed is thousands of lines of one float
/// each. A broken pipe is not an error — it is `head` having seen enough.
fn emit<T: Serialize>(value: &T) -> u8 {
    let json = match serde_json::to_string(value) {
        Ok(j) => j,
        Err(e) => {
            eprintln!("bert: could not serialize the answer: {e}");
            return exit::INTERNAL;
        }
    };
    let mut out = std::io::stdout().lock();
    match writeln!(out, "{json}") {
        Ok(()) => exit::OK,
        Err(e) if e.kind() == std::io::ErrorKind::BrokenPipe => exit::OK,
        Err(e) => {
            eprintln!("bert: could not write the answer: {e}");
            exit::INTERNAL
        }
    }
}

/// Report a load failure on stderr and hand back its exit code. Parse faults go
/// out as `path:line: message`, which is what an editor and a `grep` both
/// expect; the machine-readable copy is the caller's, on stdout.
fn report_load(path: &Path, err: &LoadError) -> u8 {
    match err {
        LoadError::Io(msg) => {
            eprintln!("bert: {msg}");
            exit::FAULT
        }
        LoadError::NotAModel(msg) => {
            eprintln!("bert: {}: {msg}", path.display());
            exit::FAULT
        }
        LoadError::Faults(faults) => {
            for fault in faults {
                eprintln!("{}:{}: {}", path.display(), fault.line, fault.message);
            }
            exit::FAULT
        }
    }
}

/// Load a model, emitting the machine-readable faults on stdout if it fails.
fn load_or_report(path: &Path) -> Result<CanvasModel, u8> {
    match input::load(path) {
        Ok(model) => Ok(model),
        Err(err) => {
            let code = report_load(path, &err);
            if let LoadError::Faults(faults) = &err {
                emit(&Faults { errors: faults });
            }
            Err(code)
        }
    }
}

fn run(command: Command) -> u8 {
    match command {
        Command::Compile { file } => compile(file),
        Command::Verdict { file, lens } => verdict(file, lens),
        Command::Describe { file, lens } => describe_cmd(file, lens),
        Command::Run { file, t, dt } => run_cmd(file, t, dt),
        Command::Layout { file } => layout(file),
    }
}

fn compile(file: PathBuf) -> u8 {
    let text = match input::read_text(&file) {
        Ok(t) => t,
        Err(err) => return report_load(&file, &err),
    };
    match input::compile(&text) {
        Ok(model) => emit(&model),
        Err(err) => {
            let code = report_load(&file, &err);
            if let LoadError::Faults(faults) = &err {
                emit(&Faults { errors: faults });
            }
            code
        }
    }
}

/// The lens to read under: the flag if given, else the model's own pin.
fn lens_for(model: &CanvasModel, lens: Option<LensArg>) -> Lens {
    lens.map(Lens::from).unwrap_or(model.lens)
}

fn verdict(file: PathBuf, lens: Option<LensArg>) -> u8 {
    let model = match load_or_report(&file) {
        Ok(m) => m,
        Err(code) => return code,
    };
    let analysis = analyze(&model, lens_for(&model, lens));
    let refusals: Vec<&str> = analysis
        .validation
        .issues
        .iter()
        .filter(|i| i.severity == Severity::Error)
        .map(|i| i.message.as_str())
        .collect();
    let code = emit(&analysis);
    if code != exit::OK {
        return code;
    }
    if refusals.is_empty() {
        return exit::OK;
    }
    eprintln!(
        "bert: {} refused {} ({} error{})",
        file.display(),
        // The lens is on stdout too, at `.description.lens`; naming it here
        // keeps the stderr line self-contained for a human reading a log.
        lens_name(lens_for(&model, lens)),
        refusals.len(),
        if refusals.len() == 1 { "" } else { "s" }
    );
    for message in refusals {
        eprintln!("  {message}");
    }
    exit::REFUSED
}

fn lens_name(lens: Lens) -> &'static str {
    match lens {
        Lens::Klir => "Klir",
        Lens::Bunge => "Bunge",
        Lens::Mobus => "Mobus",
    }
}

fn describe_cmd(file: PathBuf, lens: Option<LensArg>) -> u8 {
    let model = match load_or_report(&file) {
        Ok(m) => m,
        Err(code) => return code,
    };
    emit(&describe(&model, lens_for(&model, lens)))
}

fn run_cmd(file: PathBuf, t: f64, dt: f64) -> u8 {
    let model = match load_or_report(&file) {
        Ok(m) => m,
        Err(code) => return code,
    };
    let world = project(&model);
    let spec = match bert_core::operational::validate_operational(&world) {
        Ok(spec) => spec,
        Err(errors) => {
            eprintln!(
                "bert: {} does not project to an executable model ({} error{})",
                file.display(),
                errors.len(),
                if errors.len() == 1 { "" } else { "s" }
            );
            let code = emit(&NotExecutable { errors: &errors });
            return if code == exit::OK { exit::REFUSED } else { code };
        }
    };
    let mut circuit = bert_compose::from_spec(&spec);
    match bert_compose::RecordedRun::record_over(&mut circuit, &spec, dt, t) {
        Ok(recorded) => emit(&recorded.report()),
        Err(reason) => {
            eprintln!("bert: {}: {reason}", file.display());
            let code = emit(&RunRefused { refused: &reason });
            if code == exit::OK {
                exit::REFUSED
            } else {
                code
            }
        }
    }
}

fn layout(file: PathBuf) -> u8 {
    let model = match load_or_report(&file) {
        Ok(m) => m,
        Err(code) => return code,
    };
    let nodes = model
        .things
        .iter()
        .map(|thing| NodePosition {
            id: thing.id,
            name: thing.name.clone(),
            role: thing.role,
            env_kind: thing.env_kind,
            x: thing.x,
            y: thing.y,
        })
        .collect();
    emit(&LayoutReport { nodes })
}
