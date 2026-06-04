---
name: JWT signing secret
description: How the SGMA api-server picks its JWT signing secret and why there is no hardcoded fallback
---

# JWT signing secret (api-server)

The auth middleware signs/verifies JWTs with `process.env.JWT_SECRET ?? process.env.SESSION_SECRET`, and throws on startup if neither is set. There is intentionally **no** static fallback string.

**Why:** A hardcoded fallback secret means anyone who knows the string can forge tokens with any `userId`/`role` and impersonate other members (full authz bypass on `requireAuth` routes). Failing fast on a missing secret is safer than silently booting insecure.

**How to apply:** This project ships `SESSION_SECRET` (not `JWT_SECRET`) in the environment, so the chain resolves to `SESSION_SECRET`. If you add a deployment, ensure one of these secrets exists or the server will refuse to start. Never reintroduce a literal default secret.
