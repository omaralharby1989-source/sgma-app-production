#!/bin/sh
# Xcode Cloud post-clone script
# Runs after the repository is cloned, before Xcode builds.
# Required because Package.swift resolves AdMob + SplashScreen
# from local node_modules paths.

set -e

echo "=== ci_post_clone: Installing pnpm and workspace dependencies ==="

# Install pnpm (Xcode Cloud images have Node.js but not pnpm)
npm install -g pnpm@10

# Install all workspace dependencies (resolves node_modules for SPM local paths)
cd "$CI_WORKSPACE_PATH"
pnpm install --frozen-lockfile

echo "=== ci_post_clone: Building web bundle ==="
VITE_API_BASE_URL=https://sgma-app.org \
VITE_ADMOB_TEST_MODE=true \
  pnpm --filter @workspace/sgma-app2 run build:cap

echo "=== ci_post_clone: Syncing Capacitor iOS ==="
pnpm --filter @workspace/sgma-app2 exec cap sync ios

echo "=== ci_post_clone: Done ==="
