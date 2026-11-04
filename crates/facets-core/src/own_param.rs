//! A work process's own parameter, in the word SL says it with (walk row 18).
//!
//! The one map between the SL words (`gain`, `efficiency`, `impedance`) and
//! the engine's `param`. SL parses and emits through it
//! (`facets-canvas/src/sl.rs` re-exports it), the run inputs read it off
//! `engine_knobs` (`facets-kernel/src/knobs.rs`), and the bench session
//! converts a knob turned by its word through it
//! (`facets-tether/src/bench.rs`). It lives here, in the semantic authority,
//! because the bench sees only the engine side and cannot reach the canvas
//! crate.

use crate::ProcessPrimitive;

/// A work process's own parameter, as SL says it.
///
/// The engine runs one number per process, `Node.param`, carried on the
/// canvas as `Thing.agency_capacity`. Four primitives read it
/// (`facets-compose/src/circuit.rs`, the step), and each says it in its own
/// word, the one the engine's teaching cards already use
/// (`facets-compose/src/docs.rs`): a sensor's and an amplifier's `gain`, a
/// pump's `efficiency`, a resistance's `impedance`. The SL value `v` and the
/// engine's `p` are related by `v = offset + scale · p`, so an amplifier's
/// `gain` is the multiplier the step applies (`1 + 9p`) and an impedance is
/// the share held back (`1 − p`). SL accepts `p > 0`, and `p ≤ max_param`
/// where there is one; a model carrying anything else refuses to emit.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct OwnParam {
    pub primitive: ProcessPrimitive,
    pub word: &'static str,
    pub offset: f64,
    pub scale: f64,
    pub max_param: Option<f64>,
    /// The accepted range in the word's own terms, for faults and the knob.
    pub range: &'static str,
    /// What the number is, in Mobus's terms, for faults.
    pub meaning: &'static str,
}

pub const OWN_PARAMS: &[OwnParam] = &[
    OwnParam {
        primitive: ProcessPrimitive::Sensing,
        word: "gain",
        offset: 0.0,
        scale: 1.0,
        max_param: None,
        range: "greater than 0",
        meaning: "the sensor's multiplier from level to signal",
    },
    OwnParam {
        primitive: ProcessPrimitive::Amplifying,
        word: "gain",
        offset: 1.0,
        scale: 9.0,
        max_param: None,
        range: "greater than 1",
        meaning: "the amplifier's multiplier from weak signal to strong, capped by the power it is fed",
    },
    OwnParam {
        primitive: ProcessPrimitive::Propelling,
        word: "efficiency",
        offset: 0.0,
        scale: 1.0,
        max_param: Some(1.0),
        range: "greater than 0 and at most 1",
        meaning: "the share of what the pump is handed that it pushes on; the rest is lost to the work",
    },
    OwnParam {
        primitive: ProcessPrimitive::Impeding,
        word: "impedance",
        offset: 1.0,
        scale: -1.0,
        max_param: Some(1.0),
        range: "at least 0 and less than 1",
        meaning: "the share of the flow the resistance holds back",
    },
];

/// The own parameter `p` reads, if the engine reads one for it.
pub fn own_param(p: ProcessPrimitive) -> Option<&'static OwnParam> {
    OWN_PARAMS.iter().find(|o| o.primitive == p)
}

/// Whether `word` is a process's own-parameter word on any primitive.
pub fn is_own_word(word: &str) -> bool {
    OWN_PARAMS.iter().any(|o| o.word == word)
}

/// The engine value `p` an own-parameter `word` at SL value `v` means on a
/// component of `primitive`, or the refusal SL and the bench both give: a
/// word on a primitive that does not read it names the primitives that do
/// and the component's own word if it has one; a value outside the word's
/// range names the range and what the number is.
pub fn resolve(primitive: Option<ProcessPrimitive>, word: &str, v: f64) -> Result<f64, String> {
    let Some(op) = primitive.and_then(own_param).filter(|o| o.word == word) else {
        return Err(wrong_primitive(primitive, word));
    };
    let p = op.param_of(v);
    if op.admits(p) {
        Ok(p)
    } else {
        Err(op.out_of_range())
    }
}

/// The refusal for an own-parameter `word` on a component of `primitive`
/// that does not read it.
pub fn wrong_primitive(primitive: Option<ProcessPrimitive>, word: &str) -> String {
    let readers: Vec<String> = OWN_PARAMS
        .iter()
        .filter(|o| o.word == word)
        .map(|o| format!("{:?}", o.primitive))
        .collect();
    let instead = primitive
        .and_then(own_param)
        .map(|o| format!("; a {:?} component's own parameter is `{}`", o.primitive, o.word))
        .unwrap_or_default();
    format!(
        "`{word}` applies to a {} component only — no other primitive reads it{instead}",
        readers.join(" or ")
    )
}

impl OwnParam {
    /// The engine value an SL value means.
    pub fn param_of(&self, v: f64) -> f64 {
        (v - self.offset) / self.scale
    }

    /// Whether SL can say engine value `p`.
    pub fn admits(&self, p: f64) -> bool {
        p.is_finite() && p > 0.0 && self.max_param.is_none_or(|m| p <= m)
    }

    /// Whether SL value `v` is one this word can say.
    pub fn admits_value(&self, v: f64) -> bool {
        self.admits(self.param_of(v))
    }

    /// The refusal for a value outside this word's range.
    pub fn out_of_range(&self) -> String {
        format!(
            "`{}` on a {:?} component must be {} — it is {}",
            self.word, self.primitive, self.range, self.meaning
        )
    }

    /// The SL value for engine value `p`: the shortest decimal that parses
    /// back to the same `f32`, so `impedance 0.3` re-emits as `0.3` and not
    /// as the float error of `1 − 0.7`.
    pub fn value_of(&self, p: f32) -> f64 {
        let exact = self.offset + self.scale * p as f64;
        for digits in 1..=17 {
            let candidate: f64 = format!("{:.*e}", digits - 1, exact).parse().unwrap_or(exact);
            if self.param_of(candidate) as f32 == p {
                return candidate;
            }
        }
        exact
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The amplifier's gain is the step's multiplier `1 + 9p`, an impedance
    /// the share held back `1 − p`, and each refuses what it cannot say.
    #[test]
    fn a_word_resolves_through_its_primitive_or_names_the_right_one() {
        let amp = Some(ProcessPrimitive::Amplifying);
        let p = resolve(amp, "gain", 20.0).unwrap();
        assert!((p - 19.0 / 9.0).abs() < 1e-12);
        let imp = resolve(Some(ProcessPrimitive::Impeding), "impedance", 0.9).unwrap();
        assert!((imp - 0.1).abs() < 1e-12);
        assert_eq!(resolve(Some(ProcessPrimitive::Propelling), "efficiency", 0.5), Ok(0.5));
        let low = resolve(amp, "gain", 1.0).unwrap_err();
        assert!(low.contains("greater than 1"), "{low}");
        let wrong = resolve(amp, "impedance", 0.5).unwrap_err();
        assert!(wrong.contains("Impeding component only") && wrong.contains("is `gain`"), "{wrong}");
        let none = resolve(Some(ProcessPrimitive::Buffering), "gain", 2.0).unwrap_err();
        assert!(none.contains("Sensing or Amplifying") && !none.contains("own parameter is"), "{none}");
    }
}
