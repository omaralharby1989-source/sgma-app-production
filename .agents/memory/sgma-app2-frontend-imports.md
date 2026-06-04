---
name: SGMA APP2 frontend import rules
description: What the sgma-app2 React frontend can and cannot import
---

## Rule: No @workspace/api-zod in frontend
The design subagent tends to import deep paths from `@workspace/api-zod/src/generated/types/*` (e.g. `LoginInputRole`, `SignupInputRole`, `MemberProfileRole`). These do NOT work in the frontend — api-zod is server-side only.

**Fix:** Replace with inline string literals or z.enum([...]).

Example:
- BAD: `import { LoginInputRole } from "@workspace/api-zod/src/generated/types/loginInputRole"`
- GOOD: `z.enum(["MEMBER", "MODERATOR", "ADMIN", "SUPER_ADMIN"])` and `"MEMBER"` as string literal

**Why:** @workspace/api-zod is not listed in artifacts/sgma-app2/package.json devDependencies and deep paths don't resolve in Vite.

**How to apply:** After any design subagent run, grep for `@workspace/api-zod` in the frontend src and fix all occurrences.
