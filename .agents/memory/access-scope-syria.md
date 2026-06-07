---
name: Syria academy access scope
description: How SYRIA_ACADEMY_ONLY accessScope gates routes and the admin-users edit data-loss trap.
---

# accessScope (FULL_APP vs SYRIA_ACADEMY_ONLY)

`requireFullApp` middleware (api-server `middlewares/auth.ts`) 403s any request whose JWT `accessScope === "SYRIA_ACADEMY_ONLY"` with Arabic "هذه الميزة غير متاحة لحسابك". Frontend `ProtectedRoute fullAppOnly` redirects such users to `/unauthorized`; `isSyriaUser()` in `lib/auth.ts` is the client check.

**Rule:** any staff/admin surface that a Syria-scoped account must NOT reach needs BOTH `staffOnly` AND `fullAppOnly` on the route, AND `requireFullApp` on every backend route — `isStaff` alone is not enough because an admin can set a staff user's accessScope to SYRIA. This is why `/admin/academy` (route + all `/api/admin/academy/*` handlers) carries `requireFullApp`, and the academy landing hides the "إدارة الأكاديمية" card when `isSyriaUser(user)`.
**Why:** a SY-scoped staff account would otherwise manage academy content, violating the read-only-consumer intent.

# Admin users edit: academy specialties overwrite trap

`AdminUserItem` (the list payload) does NOT include `academyAllowedSpecialties` (only `academySpecialty`). Editing that multi-select from an empty baseline silently wipes stored values on save.
**How to apply:** in `pages/admin/users.tsx`, `openEdit` preloads authoritative values via `getAdminUser(id)` (the detail endpoint returns `academyAllowedSpecialties`) before enabling edits. Backend admin-users PATCH only writes a field when it is `!== undefined`, so omitting an untouched field is safe.
