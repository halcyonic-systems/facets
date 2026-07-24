//! Discrete-time Markov chains (#67) — the state-machine run mode.
//!
//! `run.rs` evolves a conserved quantity through work processes. A finite-state
//! automaton has no conserved quantity: its natural dynamics put weights on the
//! transitions and evolve a distribution over states, `vₙ₊₁ = vₙ P`. This is that
//! mode, kept deliberately separate from the conservation engine — the same
//! `(T, R)` structure a Klir DLG already carries (states = things, transitions =
//! directed relations), read with weights on the edges instead of substance.
//!
//! The canonical transition data mirrors the SSF Lean kind
//! (`Systems/Dynamics/Transition.lean`, `kindCodomain .markov = List (X × Nat)`):
//! per state, its Nat-weighted successors. That is the source of truth. The
//! row-stochastic float matrix `P` the stepper actually iterates is a *derived
//! readout* off those counts, not a second authority.
//!
//! The seam a hosting face drives: a Klir model's directed relations + a weight
//! per edge → [`Chain::from_edges`] → [`Chain::run`] → a [`MarkovRun`] whose
//! `history` is the same `Vec<Vec<f32>>` shape `run.rs`'s `RecordedRun::history`
//! carries, so the trajectory views read a distribution trace and a conservation
//! trace uniformly (one H, many lenses).

/// A Markov chain over named states. The canonical transition data is
/// [`Chain::succ`] — Nat-weighted successors per state, the SSF `List (X × Nat)`
/// form. The row-stochastic matrix is *derived* from it ([`Chain::p`]); it is a
/// readout, never stored as the truth.
#[derive(Clone, Debug)]
pub struct Chain {
    pub states: Vec<String>,
    /// Per state `i`, the successors `(j, weight)` with integer weights — the
    /// counts form of `kindCodomain .markov`. A state with an empty successor
    /// list is a dead end: the derived readout treats it as absorbing.
    pub succ: Vec<Vec<(usize, u64)>>,
}

impl Chain {
    /// Build a chain from weighted directed edges `(from, to, weight)` over
    /// `states`. Parallel edges accumulate their weights into one successor
    /// entry, so the canonical form holds at most one `(j, _)` per `(i, j)`.
    /// Weights are the raw Nat counts (SSF form); normalization to probabilities
    /// happens only in the derived [`Chain::p`].
    pub fn from_edges(states: Vec<String>, edges: &[(usize, usize, u64)]) -> Chain {
        let n = states.len();
        let mut acc = vec![vec![0u64; n]; n];
        for &(i, j, w) in edges {
            acc[i][j] += w;
        }
        let succ = acc
            .into_iter()
            .map(|row| {
                row.into_iter()
                    .enumerate()
                    .filter(|&(_, w)| w > 0)
                    .collect()
            })
            .collect();
        Chain { states, succ }
    }

    /// The derived row-stochastic transition matrix `P`. `p[i][j]` is the
    /// probability of stepping from `i` to `j`: state `i`'s successor weights
    /// normalized to sum to 1. A dead-end state (no successors) is closed into an
    /// absorbing self-loop so every row is a distribution — the matrix is
    /// stochastic even for an automaton with dead ends. This is a *readout* of
    /// [`Chain::succ`], recomputed on demand.
    pub fn p(&self) -> Vec<Vec<f64>> {
        let n = self.states.len();
        let mut p = vec![vec![0.0; n]; n];
        for (i, row) in p.iter_mut().enumerate() {
            let total: u64 = self.succ[i].iter().map(|&(_, w)| w).sum();
            if total == 0 {
                row[i] = 1.0;
            } else {
                for &(j, w) in &self.succ[i] {
                    row[j] = w as f64 / total as f64;
                }
            }
        }
        p
    }

    /// One step of the master equation: the successor distribution `v P`, read
    /// off the derived matrix so dead ends absorb their mass.
    pub fn step(&self, v: &[f64]) -> Vec<f64> {
        let n = self.states.len();
        let mut out = vec![0.0; n];
        for (i, &vi) in v.iter().enumerate() {
            if vi == 0.0 {
                continue;
            }
            let total: u64 = self.succ[i].iter().map(|&(_, w)| w).sum();
            if total == 0 {
                out[i] += vi;
            } else {
                for &(j, w) in &self.succ[i] {
                    out[j] += vi * (w as f64 / total as f64);
                }
            }
        }
        out
    }

    /// The distribution trajectory from `v0`: `ticks + 1` rows, `v0` first, then
    /// each successor. Row `t` is the state distribution after `t` steps. Kept in
    /// `f64` for precise convergence and property checks.
    pub fn trajectory(&self, v0: &[f64], ticks: usize) -> Vec<Vec<f64>> {
        let mut trace = Vec::with_capacity(ticks + 1);
        let mut v = v0.to_vec();
        trace.push(v.clone());
        for _ in 0..ticks {
            v = self.step(&v);
            trace.push(v.clone());
        }
        trace
    }

    /// Run the chain from `v0` for `ticks` steps into a [`MarkovRun`] — the
    /// distribution trace in the shared `Vec<Vec<f32>>` H shape the trajectory
    /// views read, the discrete-time analogue of `RecordedRun::record`.
    pub fn run(&self, v0: &[f64], ticks: usize) -> MarkovRun {
        let history = self
            .trajectory(v0, ticks)
            .into_iter()
            .map(|row| row.into_iter().map(|x| x as f32).collect())
            .collect();
        MarkovRun {
            states: self.states.clone(),
            history,
        }
    }

    /// A point-mass distribution on state `i` — the natural start for an
    /// automaton that begins in one known state. Clamps into range on an empty
    /// chain rather than panicking.
    pub fn point_mass(&self, i: usize) -> Vec<f64> {
        let n = self.states.len();
        let mut v = vec![0.0; n];
        if i < n {
            v[i] = 1.0;
        }
        v
    }
}

/// One recorded Markov run: the state labels and the distribution trajectory in
/// the shared H shape. Distinct in kind from [`crate::run::RecordedRun`] — no Δt,
/// no conservation ledger, no residual, because a distribution over an automaton
/// conserves probability, not substance. What the two share is `history:
/// Vec<Vec<f32>>`, so a lens readout consumes either uniformly.
#[derive(Clone, Debug)]
pub struct MarkovRun {
    pub states: Vec<String>,
    /// Per-tick rows, row `t` = the state distribution after `t` steps. Same
    /// shape as `RecordedRun::history`; here each column is a state, each value a
    /// probability, and every row sums to 1.
    pub history: Vec<Vec<f32>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The parity automaton over `{0, 1}`: state Even/Odd, `1` flips parity, `0`
    /// preserves it. Reading each input bit as `1` with integer odds `one:zero`
    /// induces the symmetric chain — uniform odds `1:1` is the fair coin,
    /// P = [[½, ½], [½, ½]].
    fn parity(one: u64, zero: u64) -> Chain {
        Chain::from_edges(
            vec!["Even".into(), "Odd".into()],
            &[
                (0, 1, one),  // Even --1--> Odd
                (0, 0, zero), // Even --0--> Even (self-loop, legal at Klir/Core)
                (1, 0, one),  // Odd  --1--> Even
                (1, 1, zero), // Odd  --0--> Odd  (self-loop)
            ],
        )
    }

    fn close(a: &[f64], b: &[f64]) -> bool {
        a.len() == b.len() && a.iter().zip(b).all(|(x, y)| (x - y).abs() < 1e-9)
    }

    /// `a · M` for a row vector and a square matrix — the readout the stepper
    /// implements, spelled out so the Chapman–Kolmogorov test can name P² directly.
    fn vmul(v: &[f64], m: &[Vec<f64>]) -> Vec<f64> {
        let n = m.len();
        let mut out = vec![0.0; n];
        for (i, &vi) in v.iter().enumerate() {
            for (j, o) in out.iter_mut().enumerate() {
                *o += vi * m[i][j];
            }
        }
        out
    }

    fn matmul(a: &[Vec<f64>], b: &[Vec<f64>]) -> Vec<Vec<f64>> {
        let n = a.len();
        (0..n)
            .map(|i| {
                (0..n)
                    .map(|j| (0..n).map(|k| a[i][k] * b[k][j]).sum())
                    .collect()
            })
            .collect()
    }

    #[test]
    fn canonical_succ_is_nat_weighted() {
        // The truth is the count form; the float matrix is derived from it.
        let c = parity(1, 3);
        assert_eq!(c.succ[0], vec![(0, 3), (1, 1)]);
        assert_eq!(c.succ[1], vec![(0, 1), (1, 3)]);
        let p = c.p();
        assert!(close(&p[0], &[0.75, 0.25]));
    }

    #[test]
    fn derived_matrix_is_stochastic() {
        let p = parity(3, 7).p();
        for row in &p {
            assert!((row.iter().sum::<f64>() - 1.0).abs() < 1e-12, "row not stochastic");
        }
    }

    #[test]
    fn fair_input_mixes_in_one_step() {
        // Uniform odds make the second eigenvalue 0: from a point mass on Even,
        // one step lands exactly on the uniform stationary distribution.
        let c = parity(1, 1);
        let v1 = c.step(&c.point_mass(0));
        assert!(close(&v1, &[0.5, 0.5]), "fair input should mix in one step, got {v1:?}");
    }

    #[test]
    fn parity_converges_to_uniform_for_any_biased_coin() {
        // The stationary distribution is [½, ½] for every non-degenerate bias —
        // the parity of a biased-coin stream is asymptotically uniform.
        for &(one, zero) in &[(1, 9), (1, 3), (3, 1), (9, 1)] {
            let c = parity(one, zero);
            let run = c.run(&c.point_mass(0), 200);
            let last = run.history.last().unwrap();
            assert!(
                (last[0] - 0.5).abs() < 1e-6 && (last[1] - 0.5).abs() < 1e-6,
                "odds {one}:{zero} did not converge, got {last:?}"
            );
        }
    }

    #[test]
    fn dead_end_state_absorbs() {
        // A state with no successors holds its mass: canonical succ is empty, the
        // derived readout closes it into an absorbing self-loop.
        let c = Chain::from_edges(vec!["A".into(), "B".into()], &[(0, 1, 1)]);
        assert!(c.succ[1].is_empty(), "B has no authored successor");
        assert!(close(&c.p()[1], &[0.0, 1.0]), "dead end absorbs in the readout");
        let v = c.step(&[0.0, 1.0]);
        assert!(close(&v, &[0.0, 1.0]), "absorbing state should hold, got {v:?}");
    }

    #[test]
    fn run_feeds_shared_h_shape() {
        // The run yields ticks+1 rows of the shared Vec<Vec<f32>> H shape, each a
        // state distribution.
        let c = parity(1, 3);
        let run = c.run(&c.point_mass(0), 5);
        assert_eq!(run.history.len(), 6, "ticks + 1 rows");
        assert_eq!(run.states.len(), 2);
        for row in &run.history {
            assert_eq!(row.len(), 2, "one column per state");
            assert!((row.iter().sum::<f32>() - 1.0).abs() < 1e-6, "each row is a distribution");
        }
    }

    /// The dynamics contract (dynamics-principled-position.md §4): the stepper is
    /// a semigroup. Stepping twice equals a single step under P² (Chapman–
    /// Kolmogorov / the double-step law), and every step preserves total mass.
    #[test]
    fn chapman_kolmogorov_and_mass_preservation() {
        for &(one, zero) in &[(1, 1), (1, 3), (2, 5)] {
            let c = parity(one, zero);
            let v = vec![0.7, 0.3];

            // step² = step-twice, spelled via P².
            let twice = c.step(&c.step(&v));
            let p = c.p();
            let p2 = matmul(&p, &p);
            let via_p2 = vmul(&v, &p2);
            assert!(close(&twice, &via_p2), "step² ≠ v·P² for {one}:{zero}: {twice:?} vs {via_p2:?}");

            // mass-1 preservation at every step.
            let once = c.step(&v);
            assert!(
                (once.iter().sum::<f64>() - 1.0).abs() < 1e-12,
                "step did not preserve unit mass for {one}:{zero}"
            );
        }
    }

    /// A dead-end (absorbing) chain still satisfies the semigroup law — the
    /// closed row participates in P² like any other.
    #[test]
    fn semigroup_holds_with_absorbing_state() {
        let c = Chain::from_edges(vec!["A".into(), "B".into()], &[(0, 1, 1)]);
        let v = vec![0.6, 0.4];
        let twice = c.step(&c.step(&v));
        let p = c.p();
        let via_p2 = vmul(&v, &matmul(&p, &p));
        assert!(close(&twice, &via_p2), "semigroup law fails with an absorbing state");
    }
}
