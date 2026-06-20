#!/usr/bin/env bash
# verify-ios-xcode-ready.sh
# Verifies the SGMA iOS Xcode project is complete and self-sufficient for a clean
# Archive on a fresh Mac WITHOUT any manual package additions in Xcode.
# Exit code 0 = READY, non-zero = BLOCKED.

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS="$ROOT/artifacts/sgma-app2/ios/App"
FAIL=0
pass() { printf "  \xE2\x9C\x85 %s\n" "$1"; }
fail() { printf "  \xE2\x9D\x8C %s\n" "$1"; FAIL=1; }

echo "=== SGMA iOS Xcode-ready verification ==="
echo "Project root: $IOS"
echo ""

echo "--- Required files / folders ---"
[ -f "$IOS/App.xcodeproj/project.pbxproj" ] && pass "App.xcodeproj/project.pbxproj" || fail "MISSING App.xcodeproj/project.pbxproj"
[ -d "$IOS/CapApp-SPM" ] && pass "CapApp-SPM/" || fail "MISSING CapApp-SPM/"
[ -f "$IOS/CapApp-SPM/Package.swift" ] && pass "CapApp-SPM/Package.swift" || fail "MISSING CapApp-SPM/Package.swift"
[ -d "$IOS/CapApp-SPM/Sources" ] && pass "CapApp-SPM/Sources/" || fail "MISSING CapApp-SPM/Sources/"
[ -f "$IOS/CapApp-SPM/Sources/CapApp-SPM/CapApp-SPM.swift" ] && pass "CapApp-SPM source file" || fail "MISSING CapApp-SPM source file"
[ -f "$IOS/Vendors/admob/Package.swift" ] && pass "Vendors/admob/Package.swift" || fail "MISSING Vendors/admob/Package.swift"
[ -d "$IOS/Vendors/admob/ios/Sources" ] && pass "Vendors/admob/ios/Sources/" || fail "MISSING Vendors/admob/ios/Sources/"
[ -f "$IOS/Vendors/splash-screen/Package.swift" ] && pass "Vendors/splash-screen/Package.swift" || fail "MISSING Vendors/splash-screen/Package.swift"
[ -d "$IOS/Vendors/splash-screen/ios/Sources" ] && pass "Vendors/splash-screen/ios/Sources/" || fail "MISSING Vendors/splash-screen/ios/Sources/"
[ -f "$IOS/App/AppDelegate.swift" ] && pass "App/AppDelegate.swift" || fail "MISSING App/AppDelegate.swift"
[ -f "$IOS/App/Info.plist" ] && pass "App/Info.plist" || fail "MISSING App/Info.plist"
[ -f "$IOS/App/capacitor.config.json" ] && pass "App/capacitor.config.json" || fail "MISSING App/capacitor.config.json"
[ -f "$IOS/App/config.xml" ] && pass "App/config.xml" || fail "MISSING App/config.xml"
[ -f "$IOS/App/public/index.html" ] && pass "App/public/index.html" || fail "MISSING App/public/index.html"

echo ""
echo "--- Web bundle (Build 2 assets) ---"
JS_COUNT=$(find "$IOS/App/public/assets" -maxdepth 1 -name '*.js' 2>/dev/null | wc -l | tr -d ' ')
CSS_COUNT=$(find "$IOS/App/public/assets" -maxdepth 1 -name '*.css' 2>/dev/null | wc -l | tr -d ' ')
[ "$JS_COUNT" -ge 1 ] && pass "public/assets contains $JS_COUNT JS bundle(s)" || fail "no JS bundle in public/assets"
[ "$CSS_COUNT" -ge 1 ] && pass "public/assets contains $CSS_COUNT CSS bundle(s)" || fail "no CSS bundle in public/assets"

echo ""
echo "--- Version / bundle identity ---"
grep -q "CURRENT_PROJECT_VERSION = 2;" "$IOS/App.xcodeproj/project.pbxproj" && pass "CURRENT_PROJECT_VERSION = 2" || fail "CURRENT_PROJECT_VERSION is not 2"
grep -q "MARKETING_VERSION = 1.0;" "$IOS/App.xcodeproj/project.pbxproj" && pass "MARKETING_VERSION = 1.0" || fail "MARKETING_VERSION is not 1.0"
grep -q "PRODUCT_BUNDLE_IDENTIFIER = org.sgma.app;" "$IOS/App.xcodeproj/project.pbxproj" && pass "PRODUCT_BUNDLE_IDENTIFIER = org.sgma.app" || fail "bundle id is not org.sgma.app"

echo ""
echo "--- No forbidden / non-portable paths in Package.swift files ---"
if grep -RnE "node_modules|\.pnpm|/home/runner|/workspace" \
    "$IOS/CapApp-SPM/Package.swift" \
    "$IOS/Vendors/admob/Package.swift" \
    "$IOS/Vendors/splash-screen/Package.swift" >/dev/null 2>&1; then
  fail "forbidden path found in a Package.swift"
else
  pass "no node_modules/.pnpm/home/runner/workspace paths"
fi

echo ""
echo "--- No nested public/public ---"
if [ -d "$IOS/App/public/public" ]; then fail "App/public/public nested folder exists"; else pass "no App/public/public nesting"; fi

echo ""
echo "--- pbxproj package-graph consistency ---"
if grep -q 'XCLocalSwiftPackageReference "CapApp-SPM"' "$IOS/App.xcodeproj/project.pbxproj" \
   && grep -q 'relativePath = "CapApp-SPM"' "$IOS/App.xcodeproj/project.pbxproj"; then
  pass "local package CapApp-SPM referenced with correct relativePath"
else
  fail "CapApp-SPM local package reference missing/incorrect"
fi
if grep -q 'isa = XCRemoteSwiftPackageReference' "$IOS/App.xcodeproj/project.pbxproj"; then
  fail "unexpected remote package reference in pbxproj (should be transitive via CapApp-SPM)"
else
  pass "no stray remote package refs in pbxproj (Capacitor/Cordova/Admob/Splash are transitive)"
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "RESULT: READY — iOS Xcode package graph is complete and self-sufficient."
  exit 0
else
  echo "RESULT: BLOCKED — one or more checks failed above."
  exit 1
fi
