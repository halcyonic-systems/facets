//! `bert` — the old name of `facets`, kept for one release (#541 phase 4).
//!
//! The same program, compiled from the same `main.rs`: stdout and the exit code
//! are byte for byte what `facets` gives, because scripts and goldens parse
//! them. The only difference is one line on stderr, before anything else, so a
//! person running the old name learns the new one and a pipeline notices
//! nothing. `tests/alias.rs` holds both halves of that.
//!
//! Callers outside this repository (the vault's skills, shell history) reach
//! the binary by this name until they move; this alias is what keeps them
//! working until then.

#[path = "main.rs"]
mod facets;

use std::process::ExitCode;

/// The day this alias retires: after it, the `[[bin]]` entry and this file go,
/// and `bert` is no longer built. The same date the old archive format tag
/// retires on (`facets_kernel::archive::FORMAT_RETIRING`).
pub const RETIRES: &str = "2027-01-11";

fn main() -> ExitCode {
    eprintln!("bert: renamed to facets; this alias retires {RETIRES}");
    facets::main()
}
