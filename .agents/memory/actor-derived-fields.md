---
name: Actor-derived fields must be server-forced, not client-trusted
description: Pattern for fields whose value is determined by the caller's role/identity (report type, authorId, assignee role) — derive them server-side, ignore client input.
---

# Fields determined by the actor must be forced server-side

When a field's correct value is a function of WHO is calling (their role/identity), the
server must derive it from `req.user` and ignore any client-supplied value — even if the
OpenAPI input schema technically allows it.

Concrete cases in this repo:
- **Report type** (`POST /tasks/:id/reports`): forced by role — staff → always `ADMIN_NOTE`,
  member → always `MEMBER_REPORT`. Client `reportType` is ignored. This matters because a
  `MEMBER_REPORT` on a NEW/IN_PROGRESS task auto-transitions it to `WAITING_REVIEW`; if staff
  could spoof `MEMBER_REPORT`, they'd drive a member-only state machine.
- **Assignee role**: tasks may only be assigned to `role=MEMBER` (active). Enforce in BOTH the
  list endpoint (`assignable-users`) AND the create/reassign validator (`activeUserIds`) — a
  UI-only filter is bypassable by raw POST.
- **Ownership ids** (`authorId`/`assignedById`/`reviewedById`): always from `req.user.userId`.

**Why:** the OpenAPI/Zod input schema is a convenience contract, not an authorization
boundary. A field being present in the parsed body does NOT mean the server should trust it.
Auto-transitions and access checks keyed off such a field become spoofable if you do.

**How to apply:** for any enum/flag/id whose value should depend on the caller, compute it
from `req.user` after auth and overwrite whatever the client sent. Verify by POSTing the
privileged value directly via curl and confirming the persisted row is the actor-correct one.
