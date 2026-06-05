---
name: Developer Info edit permission
description: Who may edit /developer-info and why it is identity-gated, not role-gated.
---

Editing the developer-info record (`PATCH /api/developer-info`) is gated on a specific
identity, NOT a role: the backend resolves `req.user.userId` to the DB user and requires
`user.email === "lordhygm@gmail.com" AND user.isDeveloper === true`. Everyone else (incl.
other SUPER_ADMINs with isDeveloper=false) gets 403.

**Why:** This is the app author's personal info card. The product requirement is that ONLY
the real developer account can change it — SUPER_ADMIN/ADMIN/MODERATOR/MEMBER must not.
Role-based checks would wrongly let any super admin edit it.

**How to apply:** Never relax this to a role check (e.g. isSuperAdmin). Keep the email+isDeveloper
DB lookup as the gate. The JWT payload has no email/isDeveloper, so the check MUST hit the DB,
not trust the token or client body. `GET /developer-info` stays public and self-seeds the single
active row via `ensureInfoRow()` so the public card never 404s on a fresh DB.
