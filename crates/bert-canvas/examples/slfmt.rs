//! Headless SL formatter: read a `.sl` file, print its canonical form (#302
//! prong 2 — comments, blank lines, and authored `@pos`/`@lens` survive).
//! `--check` prints nothing and exits non-zero if the file is not already
//! formatted (the CI-style use); `--write` rewrites the file in place. With
//! neither flag, the formatted text goes to stdout. A faulted parse prints
//! the faults and exits non-zero, same as `slcheck`.
use std::io::Read;

fn main() {
    let mut args = std::env::args().skip(1);
    let mut path: Option<String> = None;
    let mut check = false;
    let mut write = false;
    for arg in args.by_ref() {
        match arg.as_str() {
            "--check" => check = true,
            "--write" => write = true,
            "-" => path = Some("-".to_string()),
            other => path = Some(other.to_string()),
        }
    }
    let Some(path) = path else {
        eprintln!("usage: slfmt [--check | --write] <path.sl>");
        std::process::exit(2);
    };
    let text = if path == "-" {
        let mut s = String::new();
        std::io::stdin().read_to_string(&mut s).unwrap();
        s
    } else {
        std::fs::read_to_string(&path).unwrap_or_else(|e| {
            eprintln!("{path}: {e}");
            std::process::exit(2);
        })
    };

    match bert_canvas::sl::format_sl(&text) {
        Ok(formatted) => {
            if check {
                if formatted == text {
                    std::process::exit(0);
                } else {
                    eprintln!("{path}: not formatted");
                    std::process::exit(1);
                }
            } else if write {
                if formatted != text {
                    std::fs::write(&path, &formatted).unwrap_or_else(|e| {
                        eprintln!("{path}: {e}");
                        std::process::exit(2);
                    });
                }
            } else {
                print!("{formatted}");
            }
        }
        Err(errs) => {
            for e in errs {
                if e.line == 0 {
                    eprintln!("{path}: {}", e.message);
                } else {
                    eprintln!("{path}:{}: {}", e.line, e.message);
                }
            }
            std::process::exit(1);
        }
    }
}
