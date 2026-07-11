#!/usr/bin/env bash
# Build a self-contained macOS .app for bert-lenses (the canvas front door).
# The release binary is COPIED INTO the bundle (Contents/MacOS/), so the app
# keeps working even if target/ is cleaned. Re-run after code changes to update.
#
# Usage: scripts/bundle-macos.sh [install-dir]   (default: /Applications)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="${APP_NAME:-bert-lenses}"   # override to bundle a side-by-side variant (e.g. bert-lenses-B)
BIN="bert-lenses"                     # default cargo bin = the canvas (front door)
INSTALL_DIR="${1:-/Applications}"
APP="$INSTALL_DIR/$APP_NAME.app"

echo "› cargo build --release"
( cd "$REPO" && cargo build --release )

echo "› assembling $APP"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$REPO/target/release/$BIN" "$APP/Contents/MacOS/$APP_NAME"
chmod +x "$APP/Contents/MacOS/$APP_NAME"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$APP_NAME</string>
  <key>CFBundleDisplayName</key><string>$APP_NAME</string>
  <key>CFBundleIdentifier</key><string>systems.halcyonic.$APP_NAME</string>
  <key>CFBundleVersion</key><string>0.1.0</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleExecutable</key><string>$APP_NAME</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>LSMinimumSystemVersion</key><string>10.15</string>
</dict>
</plist>
PLIST

# Strip the quarantine bit just in case; ad-hoc local apps need no signing.
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true

echo "✓ built $APP"
