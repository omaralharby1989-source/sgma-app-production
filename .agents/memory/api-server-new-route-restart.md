---
name: api-server new route file needs restart
description: Adding a brand-new route file to the Express api-server can 404 until the workflow is restarted.
---

# api-server: new route files need a workflow restart

After creating a new route module and registering it in `routes/index.ts`, the endpoint returned 404 (`Cannot GET ...`) even though the code was correct. Restarting the `artifacts/api-server` workflow fixed it immediately.

**Why:** The tsx dev watcher does not always re-evaluate the router tree when a *new* file is added and wired in; an in-place edit to an existing file usually hot-reloads, but a newly imported module may not register its routes until a full restart.

**How to apply:** When a freshly added api-server endpoint 404s but the route path and registration look correct, restart the api-server workflow before deeper debugging. Verify via `localhost:80/api/...` (through the proxy), not the service port.
