---
name: Public signup privilege-escalation guard
description: How public registration is prevented from assigning privileged roles in this contract-first repo.
---

# Public signup must not accept a client-chosen role

The public `/auth/signup` flow must never let a request pick its own role/flags. Defense is two layered:

1. **Remove the field from the OpenAPI `SignupInput` schema**, then run codegen. The generated request Zod (`@workspace/api-zod`) then has no `role` property, so `SignupBody.safeParse` strips it — the server literally cannot read a submitted role.
2. **Hardcode privileged columns at insert time** in the route: `role: "MEMBER"`, `isDeveloper: false`, `isActive: true`, `status: "ACTIVE"`.

**Why:** removing the field from the contract (not just ignoring it in code) is the durable guarantee — a future dev re-adding it to the insert can't accidentally trust client input that doesn't exist in the parsed type.

**How to apply:** any new public-facing create/registration endpoint — keep privileged fields out of the OpenAPI input schema and assign them server-side. Verify by POSTing `role: "SUPER_ADMIN"` directly and confirming the persisted row is the default role.
