---
name: Headless chromium screenshot/PDF capture in this repl
description: Robust pattern for capturing many authenticated screenshots and rendering PDFs with puppeteer-core in the Replit sandbox.
---

When generating documentation that needs many authenticated app screenshots or
an Arabic/RTL PDF, drive the real app through headless chromium (puppeteer-core).
Do NOT use jsPDF/pdfkit for Arabic — they break shaping/RTL; chromium renders it
correctly, and Google Fonts (Cairo/Tajawal) load fine during render (repl has net).

**Setup:** `pnpm add -D -w puppeteer-core`; resolve the browser with
`execSync("which chromium")` (Nix store path changes, don't hardcode it).

**Auth without a login flow:** sign a JWT manually (HS256) with `node:crypto`
(no jsonwebtoken dep needed) using the same secret the server verifies with, then
`page.goto('/login')` → `page.evaluate` to set the app's localStorage token+user
keys → `page.goto(protectedRoute)`. Matches `jwt.verify` exactly.

**Why fresh-browser-per-page matters (the big lesson):**
A SHARED browser instance WEDGES when one page hangs (e.g. pages with embedded
video iframes / heavy content). A `Promise.race` per-step timeout is NOT enough —
the rejected screenshot promise keeps the browser busy and later pages never run.
Robust pattern: launch+close a fresh browser PER page, add per-step timeouts, and
SKIP already-captured files (size>1KB) so reruns resume. For the last stubborn
shots, run each in its own `timeout 50 node script.mjs <name>` process.

**Sandbox gotcha:** `pkill -9 -f chromium` (and broad `-f` patterns) can OOM-kill
your own bash shell (exit 137/143). Prefer killing exact PIDs from `pgrep`, or
just rely on skip-existing + `timeout`-wrapped per-page processes instead of mass kills.

**Launch args:** `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage`.
Mobile viewport 402x874 @ deviceScaleFactor 2 for this app.
