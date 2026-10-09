//! The #463 move-5 words (SL v1.9): `limiting` on a Combining component and
//! `reservoir <n>` on a source line. Each parses onto the bag the engine
//! reads, emits back as itself, and refuses off its one reader (#112
//! separating rule: a clause nothing consumes is a fault, never a bag).
use bert_canvas::canvas::{project, EnvKind, Role};
use bert_canvas::sl::{emit_sl, parse_sl};

const LIEBIG: &str = "\
system \"Bakery\" : Concrete/Technical
interface Door
interface Plug
interface Counter
component Oven primitive Combining limiting
source Flour reservoir 100
source Power
sink Shop
flow Flour -> Door : matter \"flour\" substance flour amount 5
flow Door -> Oven : matter \"flour\" substance flour
flow Power -> Plug : energy \"heat\" substance heat amount 3
flow Plug -> Oven : energy \"heat\" substance heat
flow Oven -> Counter : matter \"bread\" substance bread
flow Counter -> Shop : matter \"bread\" substance bread
";

fn errs(text: &str) -> String {
    parse_sl(text)
        .expect_err("fixture must fail its check")
        .iter()
        .map(|e| e.message.clone())
        .collect::<Vec<_>>()
        .join(" | ")
}

#[test]
fn limiting_and_reservoir_parse_project_and_emit_back() {
    let m = parse_sl(LIEBIG).unwrap();
    let oven = m.things.iter().find(|t| t.name == "Oven").unwrap();
    assert_eq!(oven.cognitive_params.get("limiting"), Some(&1.0));
    let flour = m.things.iter().find(|t| t.name == "Flour").unwrap();
    assert_eq!((flour.role, flour.env_kind), (Role::Environment, EnvKind::Source));
    assert_eq!(flour.cognitive_params.get("reservoir"), Some(&100.0));

    let world = project(&m);
    let src = world.environment.sources.iter().find(|s| s.info.name == "Flour").unwrap();
    assert_eq!(src.reservoir, Some(100.0));
    let power = world.environment.sources.iter().find(|s| s.info.name == "Power").unwrap();
    assert_eq!(power.reservoir, None);
    let spec = bert_core::operational::validate_operational(&world).unwrap();
    assert_eq!(spec.sources.iter().find(|s| s.name == "Flour").unwrap().reservoir, Some(100.0));
    assert_eq!(spec.processes.iter().find(|p| p.name == "Oven").unwrap().cognitive_params.get("limiting"), Some(&1.0));

    let text = emit_sl(&m).unwrap();
    assert!(text.contains("component Oven primitive Combining limiting"), "{text}");
    assert!(text.contains("source Flour reservoir 100"), "{text}");
    let again = parse_sl(&text).unwrap();
    let bags = |m: &bert_canvas::canvas::CanvasModel| {
        let mut v: Vec<(String, Vec<(String, f64)>)> = m
            .things
            .iter()
            .map(|t| {
                let mut b: Vec<(String, f64)> = t.cognitive_params.iter().map(|(k, v)| (k.clone(), *v)).collect();
                b.sort_by(|a, b| a.0.cmp(&b.0));
                (t.name.clone(), b)
            })
            .collect();
        v.sort_by(|a, b| a.0.cmp(&b.0));
        v
    };
    assert_eq!(bags(&again), bags(&m));
}

#[test]
fn each_word_refuses_off_its_reader() {
    let base = "system \"S\" : Concrete/Technical\nsource In\nsink Out\n";
    let f = |line: &str| errs(&format!("{base}{line}\nflow In -> X : matter \"a\"\nflow X -> Out : matter \"b\"\n"));
    assert!(f("component X primitive Buffering limiting interface").contains("Combining component only"));
    assert!(f("component X primitive Combining limiting limiting interface").contains("already given"));
    assert!(errs("system \"S\" : Concrete/Technical\nsink Out reservoir 5\n").contains("`source` line only"), "sink");
    assert!(errs("system \"S\" : Concrete/Technical\ncomponent X reservoir 5\n").contains("`source` line only"), "component");
    assert!(errs("system \"S\" : Concrete/Technical\nsource In reservoir -1\n").contains("reservoir syntax"), "negative");
    assert!(errs("system \"S\" : Concrete/Technical\nsource In reservoir 5 reservoir 6\n").contains("already given"), "twice");
}
