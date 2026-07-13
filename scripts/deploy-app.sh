#!/bin/bash
# Rebuild the release binary, refresh /Applications/bert-lenses.app, re-sign, relaunch.
# The three manual steps that silently break the code signature, as one command (#30).
set -euo pipefail
cd "$(dirname "$0")/.."
cargo build --release
osascript -e 'quit app "bert-lenses"' 2>/dev/null || true
sleep 0.5
cp target/release/bert-lenses /Applications/bert-lenses.app/Contents/MacOS/bert-lenses
codesign --force --deep -s - /Applications/bert-lenses.app
open /Applications/bert-lenses.app
echo "deployed $(git rev-parse --short HEAD) → /Applications/bert-lenses.app"
