// Embed the build receipt (#30): git sha + build date reach the binary as env
// vars, shown in-app and stamped into every ledger line — so a stale deploy is
// visible instead of indistinguishable from a fresh one.
use std::process::Command;

fn main() {
    let sha = Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    let dirty = Command::new("git")
        .args(["status", "--porcelain"])
        .output()
        .ok()
        .map(|o| !o.stdout.is_empty())
        .unwrap_or(false);
    let stamp = if dirty { format!("{sha}+") } else { sha };
    println!("cargo:rustc-env=LENSES_BUILD_SHA={stamp}");
    println!("cargo:rerun-if-changed=.git/HEAD");
    println!("cargo:rerun-if-changed=.git/index");
}
