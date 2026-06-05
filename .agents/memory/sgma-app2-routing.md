---
name: SGMA APP2 routing & global authenticated UI
description: Which routes are public vs protected, and where global authenticated UI must be placed.
---

# SGMA APP2 routing & global authenticated UI

`/developer-info` is a PUBLIC route in `App.tsx` — it is NOT wrapped in `ProtectedRoute`/`ProtectedLayout` (Phase 1 kept it a public app-info page). All other app pages (`/home`, `/news`, `/news/:id`, `/articles`, `/chat*`, `/more`, `/broadcast`) ARE wrapped in `ProtectedLayout`.

**Why:** A global "authenticated-only" UI element (e.g. the broadcast banner) placed only in `ProtectedLayout` will silently NOT appear on `/developer-info`, even though it is reachable from the authenticated `/more` menu. This was a real review miss.

**How to apply:** When adding any global element that should appear on "all authenticated pages", either (a) embed it directly in `developer-info.tsx` in addition to `ProtectedLayout`, guarding it so it renders nothing when unauthenticated (the broadcast banner uses `retry:false` on its query so a 401 just yields no render), or (b) decide to make `/developer-info` protected. Role-gated routes use `ProtectedRoute staffOnly` which redirects non-staff to `/unauthorized`.
