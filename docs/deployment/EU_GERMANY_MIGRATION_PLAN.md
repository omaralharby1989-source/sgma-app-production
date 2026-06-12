# SGMA APP — EU / Germany Hosting Migration Plan

**Status:** Planning / preparation document only. No infrastructure, code, database,
auth, or secrets were changed to produce this document.
**Date:** 2026-06-10

---

## 1. Current hosting status

- **Platform:** Replit Deployments.
- **Deployment type:** `autoscale` (stateless web + API; scales with traffic).
- **Live:** Yes — published, public, healthy build.
  - Current production URL: `https://sgma-app.org` (custom domain, verified 2026-06-12)
  - Former temporary Replit URL (backup/historical only): `https://secure-mobile-gateway.replit.app`
- **Topology:** Single monorepo (pnpm workspaces). The frontend (`@workspace/sgma-app2`,
  React+Vite) and the API (`@workspace/api-server`, Express, served under `/api`) run
  behind one path-routing reverse proxy. `/api/healthz` returns `{"status":"ok"}`.
- **Region:** Replit **publishing geography** is selected in the Publishing UI
  (Advanced settings) **at first publish and is permanent**. It cannot be read or
  changed programmatically by the agent, and cannot be changed in place after publish.
  Compute, database, and Object Storage are colocated in the chosen geography.
  → To confirm the current region, check the Publishing tool's Advanced/Geography
  section in the Replit UI. Free plan defaults to North America; Core/Pro/Enterprise
  can choose a geography (Europe is among Replit's supported geographies — confirm the
  current list at https://docs.replit.com/cloud-services/deployments/publishing-geography).

## 2. Current database status

- **Engine:** Replit-managed PostgreSQL (Drizzle ORM).
- **Connection:** via `DATABASE_URL` secret (never exposed/printed).
- **Region:** Colocated with the deployment's publishing geography (managed by Replit;
  not separately selectable). The development database is the Replit-managed dev PG.
- **Sensitivity:** Contains real member PII, password hashes, membership data, academy
  users, messages/articles. Must be treated as confidential during any migration.

## 3. Why EU / Germany hosting is recommended

- **Data residency / GDPR:** SGMA is a Syrian-German medical association
  (`sgma-med.org`) with EU-based members. Keeping member PII in the EU simplifies
  GDPR compliance and data-residency expectations.
- **Latency:** Most users are in Europe; an EU/Germany region reduces round-trip time.
- **Trust / governance:** EU hosting aligns the data location with the organization's
  jurisdiction and the published privacy policy (`https://sgma-med.org/de/privacy-policy`).

## 4. Recommended target architecture

```
                 ┌─────────────────────────────┐
  app.sgma-med.org ─▶ Frontend (React+Vite, static/SSR) ┐
                 │                                       │  HTTPS (TLS)
  api.sgma-med.org ─▶ Backend  (Express API /api)  ◀────┘
                 │            │
                 │            ▼
                 │     PostgreSQL (EU / Germany region)
                 │            │
                 │            ▼
                 │     Automated encrypted backups (EU)
                 └─────────────────────────────┘
```

- **Frontend:** `app.sgma-med.org` (HTTPS).
- **Backend API:** `api.sgma-med.org` (HTTPS), or keep API under `app.sgma-med.org/api`
  if you prefer a single origin (current architecture uses path routing `/api`).
- **Database:** PostgreSQL hosted in an EU/Germany region.
- **HTTPS:** Managed TLS on both domains.
- **Backups:** Scheduled encrypted backups retained in the EU.

### Option A — Stay on Replit, publish to the EU geography (lowest operational change)
- Re-publish the project selecting a **Europe** geography in the Publishing UI Advanced
  settings. Because geography is permanent per deployment, this is effectively a **new
  EU deployment** (compute + DB + Object Storage colocated in the EU).
- Pros: same platform/tooling, minimal code change, managed TLS + custom domains.
- Cons: requires a fresh deployment in the EU geography and a **one-time data migration**
  from the current (US/North America) managed DB to the new EU managed DB. Requires a
  Core/Pro/Enterprise plan for geography selection.

### Option B — External EU host (maximum control / explicit Germany residency)
- Frontend + API on an EU/Germany provider; PostgreSQL in EU.
- Candidate providers to evaluate (no account created, no purchase made):
  - **Hetzner** (Germany — Falkenstein/Nuremberg), **IONOS**, **Strato** (Germany VPS).
  - **Fly.io** (`fra` Frankfurt region), **Render** (Frankfurt), **Railway** (EU region).
  - Managed Postgres in EU: Neon (EU regions), Supabase (Frankfurt), provider-native PG.
- Pros: explicit Germany/EU residency, full control.
- Cons: more setup/ops (TLS, CI/CD, backups, monitoring) you manage yourself.

## 5. Safe migration steps (high level — execute only after explicit confirmation)

1. **Confirm plan + region availability** (plan tier supports EU geography, or EU host chosen).
2. **Freeze writes / maintenance window** (short) to get a consistent DB snapshot.
3. **Backup current DB** (`pg_dump`, compressed, kept private) — already have a recent
   final-release-candidate backup as a safety net.
4. **Provision target** (EU deployment or EU host + EU PostgreSQL).
5. **Restore DB** into the EU PostgreSQL; verify row counts and a few sanity queries
   (no data printed to shared logs).
6. **Set environment variables** on the target (see §8). Do not hardcode domains in code.
7. **Deploy app** to the target; run smoke tests against the new URLs.
8. **Map DNS** for `app.sgma-med.org` / `api.sgma-med.org` (see §7); wait for propagation.
9. **Switch traffic** (DNS cutover) once health checks pass.
10. **Monitor**, then decommission the old deployment after a verification period.

## 6. Rollback plan

- Keep the **old deployment running** until the new EU environment is fully verified.
- DNS rollback: repoint `app`/`api` records back to the old deployment (low TTL during
  cutover makes this fast).
- DB rollback: the pre-migration `pg_dump` backup is the restore point; if writes
  occurred on the new DB before rollback, reconcile from the new DB's dump.
- No destructive action (delete old deployment / old DB) until sign-off.

## 7. Required DNS records (to be provided by the sgma-med.org domain manager)

| Host | Type | Points to |
|------|------|-----------|
| `app.sgma-med.org` | CNAME (or A/AAAA) | the new frontend deployment target |
| `api.sgma-med.org` | CNAME (or A/AAAA) | the new backend/API target |
| (TXT) | TXT | domain-verification record required by the host |

- Use a **low TTL** (e.g. 300s) during cutover for fast rollback.
- Exact record values depend on the chosen host (Replit custom-domain verification, or
  the EU provider's ingress). **DNS details are not available yet — blocker.**

## 8. Required environment variables (target environment)

| Variable | Purpose | Notes |
|----------|---------|-------|
| `DATABASE_URL` | EU PostgreSQL connection string | Secret. Set on target only; never commit. |
| `JWT_SECRET` (or `SESSION_SECRET` fallback) | JWT signing | Reuse existing secret so existing sessions/tokens remain valid, or rotate intentionally. |
| `PORT` / `BASE_PATH` | Server bind / base path | Provided by the platform/workflow. |
| `NODE_ENV=production` | Runtime mode | |
| `VITE_API_BASE_URL` | **Native (Android/iOS) builds only** | Current final value: `https://sgma-app.org`. Set to `https://api.sgma-med.org` if/when a dedicated API subdomain is configured. Leave UNSET for same-origin web. |

> The web app calls the API same-origin (`/api`) and needs **no** base-URL env var.
> Only the Capacitor native build needs `VITE_API_BASE_URL` (see §"Production API URL").

## 9. Required testing checklist (post-migration)

- [ ] App root loads over HTTPS at `app.sgma-med.org`.
- [ ] `GET api.sgma-med.org/.../healthz` (or `/api/healthz`) returns `{"status":"ok"}`.
- [ ] Login works (JWT issued) for a demo account.
- [ ] Authenticated reads (news/articles/board) load.
- [ ] Avatar upload + a write path succeed (DB writable in EU).
- [ ] Membership-number uniqueness + approval flow behave unchanged.
- [ ] No mixed-content / CORS errors in the browser console.
- [ ] Privacy policy URL still public: `https://sgma-med.org/de/privacy-policy`.
- [ ] Backups confirmed running in the EU.

## 10. Estimated blockers

- **DNS details** for `app.sgma-med.org` / `api.sgma-med.org` (from the domain manager) — **not available yet.**
- **Plan tier** (Replit geography selection needs Core/Pro/Enterprise) — to confirm.
- **One-time DB migration** US→EU (data has residency/sensitivity implications) — needs explicit confirmation; **do not migrate the database without confirmation.**
- **Production API URL** not finalized until `api.sgma-med.org` is live.
- **AAB build** still requires Android tooling (separate store blocker).

---

## Production API URL — current readiness

- **✅ Final production domain confirmed:** `https://sgma-app.org` (custom domain, verified 2026-06-12).
  Health check `https://sgma-app.org/api/healthz` returns `{"status":"ok"}`.
- The native app **already supports** `VITE_API_BASE_URL` (added during Capacitor prep):
  `artifacts/sgma-app2/src/App.tsx` reads `import.meta.env.VITE_API_BASE_URL` and, when
  set, calls `setBaseUrl(...)`. When unset (web), requests stay same-origin/relative.
- **Where to set it:** at **mobile build time** for the Android/iOS build:
  ```
  VITE_API_BASE_URL=https://sgma-app.org pnpm --filter @workspace/sgma-app2 run build:cap
  pnpm --filter @workspace/sgma-app2 exec cap sync android
  ```
  It must NOT be hardcoded in committed files.
- **Capacitor config** has no hardcoded backend URL (only `androidScheme: "https"`).
- **Mobile store submission is no longer blocked by the API URL** — the final domain is set.

## Recommendation

For the **first store release**, the lowest-risk path is to **continue on the current
Replit deployment** while the DNS details, plan tier, and a maintenance window are
arranged. Plan the **EU/Germany migration as a deliberate, confirmed step** (Option A:
re-publish to a Europe geography on Replit; or Option B: an EU host such as Hetzner/
Fly.io-`fra` + EU PostgreSQL) **before** the data-residency expectations of a full
public launch — executed with the safe-migration + rollback steps above and explicit
confirmation before any database move.
