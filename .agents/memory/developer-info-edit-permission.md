---
name: Developer-only content edit permission
description: Who may edit developer-info AND the legal/about static pages, and why it is identity-gated, not role-gated.
---

Editing developer-owned content (`PATCH /api/developer-info` and `PATCH /api/static-pages/:slug`
for privacy-policy/terms/about-sgma) is gated on a specific identity, NOT a role: the backend
resolves `req.user.userId` to the DB user and requires the user's email to match the
`DEVELOPER_EMAIL` constant defined in the route file AND `user.isDeveloper === true`. Everyone
else (incl. other SUPER_ADMINs with isDeveloper=false) gets 403.

**Why:** This is the app author's own content. The product requirement is that ONLY the real
developer account can change it — SUPER_ADMIN/ADMIN/MODERATOR/MEMBER must not. Role-based checks
would wrongly let any super admin edit it.

**How to apply:** Never relax this to a role check (e.g. isSuperAdmin). Keep the email+isDeveloper
DB lookup as the gate. The JWT payload has no email/isDeveloper, so the check MUST hit the DB,
not trust the token or client body. The matching `GET` routes stay public and self-seed their
canonical row (`ensureInfoRow()` / `ensurePageRow()` with onConflictDoNothing) so public pages
never 404 on a fresh DB.
