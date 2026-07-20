//! Dimensional unit algebra (bert-lenses#94) — the real thing behind the #76
//! interim.
//!
//! A unit string carries two independent facts: a *dimension* (what kind of
//! quantity it measures — energy, mass, a rate of volume) and a *scale* (how big
//! one of it is in base units). This module parses a unit string into both and
//! reasons about dimensions, so the kernel can settle the question #76 could only
//! smell for: a stock accumulates its inflow over Δt, so a `kW` (power) inflow
//! accrues *energy*, not power, and a declared stock unit that disagrees is a
//! stated inconsistency, not a matter of taste.
//!
//! The representation is a fixed integer-exponent vector over base dimensions (an
//! int-exponent array, deliberately not the `uom` crate — see the #94 report for
//! that trade). Dimensional consistency is exact integer comparison; conversion
//! between same-dimension units is the ratio of scales.
//!
//! **Rate-ness is syntactic, not dimensional.** Power (`W`, `T⁻³`) and energy
//! (`J`, `T⁻²`) both carry a negative time exponent, yet power is a rate and
//! energy is a stockable quantity. The distinction lives in how the unit was
//! written or named — an explicit `/time`, or a registry unit that *means* a rate
//! (the watt) — so [`Unit`] carries a `per_time` flag rather than trying to read
//! rate-ness off the exponent vector.
//!
//! What it does NOT do: it never *invents* a unit. An unparseable or unknown
//! token yields `None`, and callers treat "cannot parse" as "cannot claim" — the
//! kernel refuses only inconsistencies it can prove (observed-warns /
//! declared-refuses, `docs/kernel-architecture.md`).

/// The base quantities every unit decomposes into. SI's seven, plus the two a
/// systems model reaches for that SI has no room for — money and information.
/// The order is the index order of [`Dimension`]'s exponent array; adding a base
/// dimension means extending [`DIM_COUNT`] and this enum together.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BaseDim {
    Time,
    Length,
    Mass,
    Current,
    Temperature,
    Amount,
    Luminosity,
    Currency,
    Information,
}

/// The number of base dimensions — the width of every [`Dimension`] vector.
pub const DIM_COUNT: usize = 9;

/// A dimension: the exponent of each base quantity. `[T, L, M, …]`, so power
/// (`M·L²·T⁻³`) is `Time = -3, Length = 2, Mass = 1` and everything else zero.
/// Dimensionless (a pure count, a ratio) is the all-zero vector.
///
/// Exponents are `i8`: real units never approach ±127, and integer exponents
/// make dimensional equality exact — the whole point of not carrying floats here.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Dimension([i8; DIM_COUNT]);

impl Dimension {
    /// The dimensionless quantity — a pure number, every exponent zero.
    pub const DIMENSIONLESS: Dimension = Dimension([0; DIM_COUNT]);

    /// The dimension of a single base quantity raised to the first power.
    pub fn base(dim: BaseDim) -> Dimension {
        let mut v = [0i8; DIM_COUNT];
        v[dim as usize] = 1;
        Dimension(v)
    }

    /// Read one base exponent.
    pub fn exponent(&self, dim: BaseDim) -> i8 {
        self.0[dim as usize]
    }

    /// The product of two dimensions — exponents add (`W·s` = power × time =
    /// energy). Saturating so a pathological unit string can never panic; a real
    /// unit stays far inside `i8`.
    pub fn mul(&self, other: &Dimension) -> Dimension {
        let mut v = self.0;
        for (slot, e) in v.iter_mut().zip(other.0.iter()) {
            *slot = slot.saturating_add(*e);
        }
        Dimension(v)
    }

    /// The quotient of two dimensions — exponents subtract (`ML / mo` = volume /
    /// time = a volume rate).
    pub fn div(&self, other: &Dimension) -> Dimension {
        let mut v = self.0;
        for (slot, e) in v.iter_mut().zip(other.0.iter()) {
            *slot = slot.saturating_sub(*e);
        }
        Dimension(v)
    }

    /// This dimension raised to an integer power (a factor's exponent, e.g. the
    /// `2` in `m²`).
    pub fn powi(&self, n: i8) -> Dimension {
        let mut v = [0i8; DIM_COUNT];
        for (slot, e) in v.iter_mut().zip(self.0.iter()) {
            *slot = e.saturating_mul(n);
        }
        Dimension(v)
    }
}

/// A parsed unit: its dimension, its scale in base units (how many base-unit
/// quantities one of it is — `km` is `1000.0`, `g` is `0.001` against a `kg`
/// base), and whether it reads as a *rate* (see the module docs on `per_time`).
/// Scale exists for conversion; dimensional checking never consults it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Unit {
    pub dimension: Dimension,
    pub scale: f64,
    /// The unit denotes a rate — a quantity per unit time — either because it was
    /// written with an explicit time in the denominator (`kg/day`, `ML/mo`) or
    /// because it names a quantity that *is* a rate (the watt). This is what tells
    /// an integrable rate apart from a stockable quantity that merely happens to
    /// carry a negative time exponent (energy).
    pub per_time: bool,
}

impl Unit {
    fn quantity(scale: f64, dimension: Dimension) -> Unit {
        Unit { scale, dimension, per_time: false }
    }

    fn rate(scale: f64, dimension: Dimension) -> Unit {
        Unit { scale, dimension, per_time: true }
    }

    fn dimensionless() -> Unit {
        Unit::quantity(1.0, Dimension::DIMENSIONLESS)
    }

    /// The dimension a stock reaches by accumulating a flow of *this* unit over Δt
    /// — the flow × Δt integration rule (#94's core): one added power of time.
    pub fn integrated_dimension(&self) -> Dimension {
        self.dimension.mul(&Dimension::base(BaseDim::Time))
    }

    /// The dimension(s) a stock fed by a flow of *this* unit may legitimately
    /// carry. An explicit rate integrates to exactly one dimension (`kW` → energy,
    /// `ML/mo` → `ML`). A bare quantity is ambiguous by the Mobus per-tick
    /// convention: `L` on a flow may mean "an `L` stock filled per tick" (the flow
    /// already *is* the quantity) or "`L` per tick" integrating to `L·s`, so both
    /// are admitted rather than refusing an honest `L`-flow / `L`-stock pair.
    ///
    /// This asymmetry is what keeps the consistency check from crying wolf on
    /// every bare-quantity flow while still refusing a stock that declares itself
    /// a rate (`kW`, `kg/day`) — a rate is never a legitimate stock dimension.
    pub fn stock_candidate_dimensions(&self) -> Vec<Dimension> {
        if self.per_time {
            vec![self.integrated_dimension()]
        } else {
            vec![self.dimension, self.integrated_dimension()]
        }
    }
}

/// Convert a magnitude from one unit to another, or `None` when the two units
/// measure different dimensions (a category error — `kg` is not `m`). Same
/// dimension means the conversion is just the ratio of scales.
pub fn convert(value: f64, from: &Unit, to: &Unit) -> Option<f64> {
    if from.dimension != to.dimension {
        return None;
    }
    Some(value * from.scale / to.scale)
}

/// Parse a unit string into a [`Unit`], or `None` when it is empty or names a
/// token the registry does not know.
///
/// The grammar is deliberately small and unambiguous: a numerator, then any
/// number of `/`-separated denominators, each a `·`-separated product of factors
/// (`kW·h`, `kg/day`, `ML/mo`, `m/s²`). A factor is an optional SI prefix, a base
/// symbol, and an optional integer exponent (`m2`, `m²`, `s^-1`). Multiplication
/// adds dimensions and multiplies scales; division does the inverse. A single
/// unknown factor fails the whole parse — a unit the kernel only half-understands
/// is one it must not reason about.
pub fn parse_unit(input: &str) -> Option<Unit> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }

    // `/` splits numerator from denominators; the first segment multiplies, every
    // later one divides. `a/b/c` = a / b / c, the conventional left-to-right read.
    let mut segments = trimmed.split('/');
    let mut unit = parse_product(segments.next()?)?;
    for denom in segments {
        let d = parse_product(denom)?;
        // Dividing by a time-dimensioned denominator is what makes the whole unit
        // a rate — the syntactic signal `per_time` records.
        let denom_is_time = d.dimension.exponent(BaseDim::Time) > 0;
        unit = Unit {
            scale: unit.scale / d.scale,
            dimension: unit.dimension.div(&d.dimension),
            per_time: unit.per_time || denom_is_time,
        };
    }
    Some(unit)
}

/// A `·`/`*`/`⋅`-separated product of factors, all multiplied. A product inherits
/// rate-ness from any intrinsically-rate factor (`kW·h` stays a product of a rate
/// and a time — the `·h` is what un-rates it back to energy, handled by the time
/// exponent, so the flag is advisory and the dimension is authoritative for
/// compound forms; `per_time` matters for the *atomic* rate units the check keys
/// on).
fn parse_product(segment: &str) -> Option<Unit> {
    let mut unit = Unit::dimensionless();
    for factor in segment.split(['·', '*', '⋅']) {
        let factor = factor.trim();
        if factor.is_empty() {
            continue;
        }
        let f = parse_factor(factor)?;
        unit = Unit {
            scale: unit.scale * f.scale,
            dimension: unit.dimension.mul(&f.dimension),
            per_time: unit.per_time || f.per_time,
        };
    }
    Some(unit)
}

/// One factor: `symbol` optionally followed by an integer exponent, written
/// `m2`, `m^2`, `m²`, or `s^-1`. Splits the exponent off the tail, looks the bare
/// symbol up, then raises it.
fn parse_factor(factor: &str) -> Option<Unit> {
    let (symbol, exp) = split_exponent(factor)?;
    let base = lookup_symbol(symbol)?;
    if exp == 1 {
        return Some(base);
    }
    Some(Unit {
        scale: base.scale.powi(exp as i32),
        dimension: base.dimension.powi(exp),
        per_time: base.per_time,
    })
}

/// Peel a trailing exponent off a factor, returning `(symbol, exponent)`.
/// Recognizes ASCII `^n` / bare-trailing-digits (`m2`) and the Unicode
/// superscripts `¹²³`. Absent an exponent, the power is `1`.
fn split_exponent(factor: &str) -> Option<(&str, i8)> {
    // Unicode superscripts, which sit directly after the symbol (`m²`).
    if let Some(pos) = factor.find(['²', '³', '¹']) {
        let exp = match &factor[pos..] {
            "¹" => 1,
            "²" => 2,
            "³" => 3,
            _ => return None,
        };
        return Some((&factor[..pos], exp));
    }
    // ASCII caret form, `s^-1` / `m^3`.
    if let Some((sym, e)) = factor.split_once('^') {
        return Some((sym, e.parse().ok()?));
    }
    // Bare trailing digits, `m2`. Only when a non-digit symbol precedes them, so
    // a plain number is not mistaken for a unit.
    let digits = factor.trim_end_matches(|c: char| c.is_ascii_digit());
    if digits.len() < factor.len() && !digits.is_empty() {
        let exp: i8 = factor[digits.len()..].parse().ok()?;
        return Some((digits, exp));
    }
    Some((factor, 1))
}

/// Resolve a bare symbol (no exponent) to a [`Unit`]: an exact registry hit
/// first, then a single SI-prefix strip whose remainder is itself known. Exact
/// first is what lets irregular names win over accidental prefix reads — `min`
/// is a minute, never milli-inch; `mo` is a month, never milli-ounce.
fn lookup_symbol(symbol: &str) -> Option<Unit> {
    if let Some(unit) = registry(symbol) {
        return Some(unit);
    }
    for (prefix, factor) in SI_PREFIXES {
        if let Some(rest) = symbol.strip_prefix(prefix) {
            if !rest.is_empty() {
                if let Some(unit) = registry(rest) {
                    return Some(Unit {
                        scale: unit.scale * factor,
                        dimension: unit.dimension,
                        per_time: unit.per_time,
                    });
                }
            }
        }
    }
    None
}

/// SI decimal prefixes, longest-string-first so no prefix is a prefix of an
/// earlier match (all one character here, but the ordering rule is the invariant
/// to keep if a multi-letter prefix is ever added).
const SI_PREFIXES: &[(&str, f64)] = &[
    ("G", 1e9),
    ("M", 1e6),
    ("k", 1e3),
    ("h", 1e2),
    ("c", 1e-2),
    ("m", 1e-3),
    ("µ", 1e-6),
    ("u", 1e-6),
    ("n", 1e-9),
    ("p", 1e-12),
];

/// The known base symbols, each mapped to its scale (in base units) and
/// dimension. Compound and irregular units (`Wh`, `min`, `day`) are registered
/// whole rather than derived, so the parser never has to guess where a compound
/// splits. The base unit of each dimension has scale `1.0`: `s`, `m`, `kg`, `J`
/// energy, `W` power, etc.
fn registry(symbol: &str) -> Option<Unit> {
    use BaseDim::*;
    let time = |s: f64| Unit::quantity(s, Dimension::base(Time));
    let mass = |s: f64| Unit::quantity(s, Dimension::base(Mass));
    let length = |s: f64| Unit::quantity(s, Dimension::base(Length));
    let volume = |s: f64| Unit::quantity(s, Dimension::base(Length).powi(3));
    let energy_dim =
        Dimension::base(Mass).mul(&Dimension::base(Length).powi(2)).mul(&Dimension::base(Time).powi(-2));
    let power_dim =
        Dimension::base(Mass).mul(&Dimension::base(Length).powi(2)).mul(&Dimension::base(Time).powi(-3));

    Some(match symbol {
        // Time — base second.
        "s" | "sec" => time(1.0),
        "min" => time(60.0),
        "h" | "hr" => time(3600.0),
        "d" | "day" => time(86_400.0),
        "wk" | "week" => time(604_800.0),
        "mo" | "month" => time(2_592_000.0),
        "yr" | "year" | "y" => time(31_536_000.0),

        // Mass — base kilogram; gram carries the 10⁻³ so `kg` (prefix k on `g`)
        // and the bare `kg` symbol agree at scale 1.
        "kg" => mass(1.0),
        "g" => mass(1e-3),
        "t" | "tonne" => mass(1e3),

        // Length — base metre.
        "m" => length(1.0),

        // Volume — litre is 10⁻³ m³, so `ML` (megalitre) lands at 10³ m³.
        "L" | "l" | "liter" | "litre" => volume(1e-3),

        // Energy — base joule; a stockable quantity, not a rate.
        "J" => Unit::quantity(1.0, energy_dim),
        "Wh" => Unit::quantity(3600.0, energy_dim),
        "cal" => Unit::quantity(4.184, energy_dim),
        "kcal" | "Cal" => Unit::quantity(4184.0, energy_dim),

        // Power — base watt; a rate (energy per time) even with no slash written.
        "W" => Unit::rate(1.0, power_dim),

        // Amount of substance.
        "mol" => Unit::quantity(1.0, Dimension::base(Amount)),

        // Temperature.
        "K" => Unit::quantity(1.0, Dimension::base(Temperature)),

        // Electric current — itself charge per time, a rate.
        "A" | "amp" => Unit::rate(1.0, Dimension::base(Current)),

        // Money — dimensionful for a systems model even though SI has no cell for
        // it; the symbol names the currency, the dimension is just "Currency".
        "USD" | "$" | "EUR" | "GBP" => Unit::quantity(1.0, Dimension::base(Currency)),

        // Information.
        "bit" | "bits" => Unit::quantity(1.0, Dimension::base(Information)),
        "byte" | "bytes" => Unit::quantity(8.0, Dimension::base(Information)),

        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use BaseDim::*;

    #[test]
    fn base_and_dimensionless() {
        assert_eq!(Dimension::base(Time).exponent(Time), 1);
        assert_eq!(Dimension::base(Time).exponent(Mass), 0);
        assert_eq!(Dimension::DIMENSIONLESS, Dimension([0; DIM_COUNT]));
    }

    #[test]
    fn mul_and_div_add_and_subtract_exponents() {
        let power = parse_unit("W").unwrap().dimension;
        let time = parse_unit("s").unwrap().dimension;
        let energy = parse_unit("J").unwrap().dimension;
        // power × time = energy; energy / time = power.
        assert_eq!(power.mul(&time), energy);
        assert_eq!(energy.div(&time), power);
    }

    #[test]
    fn compound_multiply_parses() {
        // kW·h is energy, dimensionally identical to kWh and to 3.6 MJ.
        let kwh_compound = parse_unit("kW·h").unwrap();
        let kwh_whole = parse_unit("kWh").unwrap();
        assert_eq!(kwh_compound.dimension, kwh_whole.dimension);
        assert_eq!(kwh_compound.dimension, parse_unit("J").unwrap().dimension);
        // 1 kW·h = 3.6e6 J.
        assert!((kwh_compound.scale - 3.6e6).abs() < 1.0);
    }

    #[test]
    fn compound_divide_parses() {
        let rate = parse_unit("kg/day").unwrap();
        assert_eq!(rate.dimension.exponent(Mass), 1);
        assert_eq!(rate.dimension.exponent(Time), -1);
        assert!(rate.per_time);

        let vol_rate = parse_unit("ML/mo").unwrap();
        assert_eq!(vol_rate.dimension.exponent(Length), 3);
        assert_eq!(vol_rate.dimension.exponent(Time), -1);
        assert!(vol_rate.per_time);
    }

    #[test]
    fn exponent_forms_agree() {
        let a = parse_unit("m2").unwrap().dimension;
        let b = parse_unit("m^2").unwrap().dimension;
        let c = parse_unit("m²").unwrap().dimension;
        assert_eq!(a, b);
        assert_eq!(b, c);
        assert_eq!(a.exponent(Length), 2);
        assert_eq!(parse_unit("s^-1").unwrap().dimension.exponent(Time), -1);
    }

    #[test]
    fn prefixes_scale_without_changing_dimension() {
        let w = parse_unit("W").unwrap();
        let kw = parse_unit("kW").unwrap();
        assert_eq!(w.dimension, kw.dimension);
        assert!((kw.scale / w.scale - 1000.0).abs() < 1e-6);
        assert!(kw.per_time, "prefix strip preserves rate-ness");
        // kg via prefix agrees with the registered kg at scale 1.
        assert!((parse_unit("kg").unwrap().scale - 1.0).abs() < 1e-9);
    }

    #[test]
    fn exact_registry_wins_over_prefix_read() {
        // `min` is a minute (time), not milli-inch; `mo` a month, not milli-ounce.
        assert!(parse_unit("min").unwrap().dimension.exponent(Time) == 1);
        assert!(parse_unit("mo").unwrap().dimension.exponent(Time) == 1);
    }

    #[test]
    fn empty_and_unknown_are_none() {
        assert!(parse_unit("").is_none());
        assert!(parse_unit("   ").is_none());
        assert!(parse_unit("widgets").is_none());
        assert!(parse_unit("kg/frobnitz").is_none());
    }

    #[test]
    fn per_time_separates_a_rate_from_a_negative_time_quantity() {
        // The kWh confusion: energy has T⁻² yet is a stockable quantity, not a
        // rate. Rate-ness is syntactic, and the registry knows the difference.
        assert!(parse_unit("kW").unwrap().per_time, "power is a rate");
        assert!(!parse_unit("kWh").unwrap().per_time, "energy is not a rate");
        assert!(!parse_unit("J").unwrap().per_time);
        // Explicit slash makes any quantity a rate.
        assert!(parse_unit("kg/day").unwrap().per_time);
        assert!(!parse_unit("kg").unwrap().per_time);
    }

    #[test]
    fn stock_candidates_integrate_a_rate_but_admit_a_bare_quantity() {
        // A power inflow accrues energy — exactly one candidate, the classic #94
        // case; a stock declaring power is NOT among the candidates.
        let power = parse_unit("kW").unwrap();
        let energy = parse_unit("kWh").unwrap().dimension;
        assert_eq!(power.stock_candidate_dimensions(), vec![energy]);
        assert!(!power.stock_candidate_dimensions().contains(&power.dimension));

        // A volume-rate inflow accrues volume.
        let ml_per_mo = parse_unit("ML/mo").unwrap();
        let ml = parse_unit("ML").unwrap().dimension;
        assert_eq!(ml_per_mo.stock_candidate_dimensions(), vec![ml]);

        // A bare-quantity inflow admits both its own dimension (per-tick shorthand)
        // and the integrated one — an L flow may fill an L stock.
        let litres = parse_unit("L").unwrap();
        let cands = litres.stock_candidate_dimensions();
        assert!(cands.contains(&litres.dimension));
        assert!(cands.contains(&litres.integrated_dimension()));
    }

    #[test]
    fn convert_within_a_dimension_and_refuses_across() {
        // 2 kWh in joules.
        let kwh = parse_unit("kWh").unwrap();
        let j = parse_unit("J").unwrap();
        let in_joules = convert(2.0, &kwh, &j).unwrap();
        assert!((in_joules - 7.2e6).abs() < 1.0);
        // Cross-dimension conversion is a category error.
        assert!(convert(1.0, &parse_unit("kg").unwrap(), &parse_unit("m").unwrap()).is_none());
    }
}
