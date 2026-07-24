//! Discrete-time Markov chains (#67) — the state-machine run mode.
//!
//! `run.rs` evolves a conserved quantity through work processes. A finite-state
//! automaton has no conserved quantity: its natural dynamics put probabilities
//! on the transitions and evolve a distribution over states, `vₙ₊₁ = vₙ P`. This
//! is that mode, kept deliberately separate from the conservation engine — same
//! `(T, R)` structure a Klir DLG already carries (states = things, transitions =
//! directed relations), read with weights on the edges instead of substance.
//!
//! The seam a hosting face drives: a Klir model's directed relations + a weight
//! per edge → [`Chain::from_edges`] → [`Chain::trajectory`] → a per-tick
//! distribution trace the same shape the trajectory views already read.

/// A row-stochastic transition matrix over named states. `p[i][j]` is the
/// probability of stepping from state `i` to state `j`; every row sums to 1.
#[derive(Clone, Debug)]
pub struct Chain {
    pub states: Vec<String>,
    pub p: Vec<Vec<f64>>,
}

impl Chain {
    /// Build a chain from weighted directed edges `(from, to, weight)` over
    /// `states`. Weights accumulate into the transition row and each row is then
    /// normalized to a probability distribution. A state with no out-edge is
    /// treated as absorbing (it holds all its mass), so the matrix is stochastic
    /// even for an automaton with dead-end states.
    pub fn from_edges(states: Vec<String>, edges: &[(usize, usize, f64)]) -> Chain {
        let n = states.len();
        let mut p = vec![vec![0.0; n]; n];
        for &(i, j, w) in edges {
            p[i][j] += w;
        }
        for (i, row) in p.iter_mut().enumerate() {
            let sum: f64 = row.iter().sum();
            if sum > 0.0 {
                for x in row.iter_mut() {
                    *x /= sum;
                }
            } else {
                row[i] = 1.0;
            }
        }
        Chain { states, p }
    }

    /// One step of the master equation: the successor distribution `v P`.
    pub fn step(&self, v: &[f64]) -> Vec<f64> {
        let mut out = vec![0.0; self.states.len()];
        for (i, &vi) in v.iter().enumerate() {
            if vi == 0.0 {
                continue;
            }
            for (out_j, &pij) in out.iter_mut().zip(&self.p[i]) {
                *out_j += vi * pij;
            }
        }
        out
    }

    /// The distribution trajectory from `v0`: `ticks + 1` rows, `v0` first, then
    /// each successor. Row `t` is the state distribution after `t` steps — the
    /// discrete-time analogue of `RecordedRun::history`.
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
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The parity automaton over the binary alphabet {0, 1}: state Even/Odd,
    /// `1` flips parity, `0` preserves it. Reading each input bit as `1` with
    /// probability `p` induces the symmetric chain P = [[1-p, p], [p, 1-p]].
    fn parity(p: f64) -> Chain {
        Chain::from_edges(
            vec!["Even".into(), "Odd".into()],
            &[
                (0, 1, p),       // Even --1--> Odd
                (0, 0, 1.0 - p), // Even --0--> Even
                (1, 0, p),       // Odd  --1--> Even
                (1, 1, 1.0 - p), // Odd  --0--> Odd
            ],
        )
    }

    fn close(a: &[f64], b: &[f64]) -> bool {
        a.iter().zip(b).all(|(x, y)| (x - y).abs() < 1e-9)
    }

    #[test]
    fn parity_is_stochastic() {
        let c = parity(0.3);
        for row in &c.p {
            assert!((row.iter().sum::<f64>() - 1.0).abs() < 1e-12, "row not stochastic");
        }
    }

    #[test]
    fn fair_input_mixes_in_one_step() {
        // p = 1/2 makes the second eigenvalue 1 - 2p = 0: from a point mass on
        // Even, one step lands exactly on the uniform stationary distribution.
        let c = parity(0.5);
        let v1 = c.step(&[1.0, 0.0]);
        assert!(close(&v1, &[0.5, 0.5]), "fair input should mix in one step, got {v1:?}");
    }

    #[test]
    fn parity_converges_to_uniform_for_any_biased_coin() {
        // The stationary distribution is [1/2, 1/2] for every p in (0, 1) — the
        // parity of a biased-coin stream is asymptotically uniform.
        for &p in &[0.1, 0.25, 0.75, 0.9] {
            let c = parity(p);
            let trace = c.trajectory(&[1.0, 0.0], 200);
            let last = trace.last().unwrap();
            assert!(close(last, &[0.5, 0.5]), "p={p} did not converge, got {last:?}");
            // Mass is conserved at every tick.
            for row in &trace {
                assert!((row.iter().sum::<f64>() - 1.0).abs() < 1e-9, "mass not conserved");
            }
        }
    }

    #[test]
    fn dead_end_state_absorbs() {
        // A state with no out-edge holds its mass rather than leaking it.
        let c = Chain::from_edges(vec!["A".into(), "B".into()], &[(0, 1, 1.0)]);
        let v = c.step(&[0.0, 1.0]);
        assert!(close(&v, &[0.0, 1.0]), "absorbing state should hold, got {v:?}");
    }
}
