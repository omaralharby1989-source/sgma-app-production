#!/usr/bin/env bash
# ============================================================
# ios_prepare_for_mac.sh
# Run this script on MacinCloud (or any Mac) after cloning
# sgma-app-production to prepare the iOS project for Xcode.
#
# Usage:
#   chmod +x scripts/ios_prepare_for_mac.sh
#   ./scripts/ios_prepare_for_mac.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$REPO_ROOT/artifacts/sgma-app2"

echo ""
echo "======================================================"
echo "  SGMA APP — iOS Preparation Script"
echo "======================================================"
echo "  Repo root : $REPO_ROOT"
echo "  App dir   : $APP_DIR"
echo "======================================================"
echo ""

# ── 1. Move into the app directory ─────────────────────────
cd "$APP_DIR"
echo "[1/4] Working directory: $(pwd)"

# ── 2. Install dependencies ────────────────────────────────
echo ""
echo "[2/4] Installing pnpm dependencies..."
pnpm install --frozen-lockfile
echo "      ✓ pnpm install complete"

# ── 3. Build the web bundle for Capacitor ──────────────────
echo ""
echo "[3/4] Building web bundle (CAP_BUILD=1)..."
pnpm run build:cap
echo "      ✓ Web bundle built → dist/public/"

# ── 4. Sync to iOS ─────────────────────────────────────────
echo ""
echo "[4/4] Running Capacitor sync (iOS)..."
pnpm exec cap sync ios
echo "      ✓ cap sync ios complete"

# ── Verification ───────────────────────────────────────────
echo ""
echo "======================================================"
echo "  Verifying required iOS files..."
echo "======================================================"

FAIL=0

check() {
  if [ -e "$1" ]; then
    echo "  ✓ $1"
  else
    echo "  ✗ MISSING: $1"
    FAIL=1
  fi
}

check "ios/App/App/public/index.html"
check "ios/App/App/capacitor.config.json"
check "ios/App/App/config.xml"
check "ios/App/App.xcodeproj/project.pbxproj"
check "ios/App/CapApp-SPM/Package.swift"

# Check Bundle ID
BUNDLE_ID=$(grep -m1 "PRODUCT_BUNDLE_IDENTIFIER" ios/App/App.xcodeproj/project.pbxproj | tr -d ' ' | cut -d= -f2 | tr -d ';')
echo ""
echo "  Bundle ID : $BUNDLE_ID"
if [ "$BUNDLE_ID" = "org.sgma.app" ]; then
  echo "  ✓ Bundle ID is correct"
else
  echo "  ✗ Bundle ID mismatch! Expected org.sgma.app, got: $BUNDLE_ID"
  FAIL=1
fi

# Check Info.plist for AdMob
GAD=$(grep -c "GADApplicationIdentifier" ios/App/App/Info.plist 2>/dev/null || true)
if [ "$GAD" -gt 0 ]; then
  echo "  ✓ GADApplicationIdentifier present in Info.plist"
else
  echo "  ✗ GADApplicationIdentifier MISSING from Info.plist"
  FAIL=1
fi

echo ""
if [ $FAIL -eq 0 ]; then
  echo "======================================================"
  echo "  SUCCESS — iOS project is ready for Xcode!"
  echo "======================================================"
  echo ""
  echo "  Next steps on MacinCloud:"
  echo "  1. Open: artifacts/sgma-app2/ios/App/App.xcodeproj"
  echo "     (or the .xcworkspace if Pods were used)"
  echo "  2. In Xcode: select 'App' target → Signing & Capabilities"
  echo "     → set Team & ensure 'SGMA APP Store Profile' is selected"
  echo "  3. Product → Archive"
  echo "  4. Distribute App → App Store Connect"
  echo ""
else
  echo "======================================================"
  echo "  FAILURE — one or more required files are missing."
  echo "  Check the ✗ lines above and re-run this script."
  echo "======================================================"
  exit 1
fi
