---
name: Syria academy access scope
description: How SYRIA_ACADEMY_ONLY accessScope gates routes and the admin-users edit data-loss trap.
---

# accessScope (FULL_APP vs SYRIA_ACADEMY_ONLY)

`requireFullApp` middleware (api-server `middlewares/auth.ts`) 403s any request whose JWT `accessScope === "SYRIA_ACADEMY_ONLY"` with Arabic "هذه الميزة غير متاحة لحسابك". Frontend `ProtectedRoute fullAppOnly` redirects such users to `/unauthorized`; `isSyriaUser()` in `lib/auth.ts` is the client check.

**Rule:** ALL admin APIs are blocked for SY accounts by mounting `router.use(requireAuth, requireFullApp)` at the top of the admin router (`routes/admin/index.ts`) — requireAuth must run first so accessScope is populated; sub-routers re-run requireAuth idempotently. Every full-member member route (chat/tasks/board/volunteer/articles-write/broadcast) also carries `requireFullApp` per-route. On the frontend, every admin/broadcast route plus `/admin/academy` needs `fullAppOnly` on its ProtectedRoute, and the academy landing hides the admin card when `isSyriaUser(user)`.
**Why:** `isStaff`/role checks alone are not enough — an admin can set a staff user's accessScope to SYRIA, so scope must be enforced independently of role on both layers.

**Academy media exposure:** member-facing `formatLecture` must NEVER return the raw Google Drive share URL — it takes an `includeRaw` opt (default false); only admin responses pass `includeRaw:true`. Members consume `recordingEmbedUrl` (the `/preview` embed) only. Beware `.map(formatLecture)` — the array index becomes the opts arg, so wrap as `.map((row) => formatLecture(row))`. The lecture watch page overlays a per-user watermark (`fullName | membershipNumber | email`) from `getStoredUser()`.

**SY number issuance is atomic:** generating the next `SY{n}` on admin activation runs inside `db.transaction` guarded by `pg_advisory_xact_lock` so concurrent activations serialize and can't collide; the scan+increment must use the tx handle, not the global db (advisory locks are connection-scoped).

# Admin users edit: academy specialties overwrite trap

`AdminUserItem` (the list payload) does NOT include `academyAllowedSpecialties` (only `academySpecialty`). Editing that multi-select from an empty baseline silently wipes stored values on save.
**How to apply:** in `pages/admin/users.tsx`, `openEdit` preloads authoritative values via `getAdminUser(id)` (the detail endpoint returns `academyAllowedSpecialties`) before enabling edits. Backend admin-users PATCH only writes a field when it is `!== undefined`, so omitting an untouched field is safe.
