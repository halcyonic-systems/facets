//! SL compiles deterministically (spec §1, C1), across processes as well as
//! within one. A `HashMap`'s iteration order is randomized per map, so a
//! model whose agent carries its numbers in a map wrote different bytes from
//! run to run until every serialized map was written in key order
//! (`facets_core::sorted_map`). Each run here is a fresh process, which is
//! where the order varies; a model with an agent of several numbers is the
//! case that failed.

mod support;
use support::{code, facets};

#[test]
fn compile_writes_the_same_bytes_every_run() {
    for file in ["assets/bench/hospital-beds-table.sl", "assets/bench/thermostat-relay.sl"] {
        let runs: Vec<Vec<u8>> = (0..8)
            .map(|_| {
                let out = facets(&["compile", file]);
                assert_eq!(code(&out), 0, "{file}");
                out.stdout
            })
            .collect();
        assert!(runs.windows(2).all(|w| w[0] == w[1]), "{file}: compile wrote different bytes across runs");
    }
}
