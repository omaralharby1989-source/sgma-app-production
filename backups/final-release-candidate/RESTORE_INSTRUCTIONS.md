# SGMA APP — Restore Instructions (Final Release Candidate, 2026-06-10)

These instructions restore the SGMA APP from the final release-candidate backup.
Restore **only in a trusted, private environment**.

> ⚠️ The database backup contains **real member data and password hashes**. Keep it
> private. Never commit it, never upload it to a public location, never print its
> contents to logs or shared terminals.

---

## 1. Unzip the source code

```bash
mkdir sgma-app-restore
cd sgma-app-restore
unzip /path/to/SGMA_APP_FINAL_RELEASE_CANDIDATE_CODE_2026_06_10.zip
```

The archive contains the full project source (monorepo) **without** `node_modules`,
`.git`, build output, caches, logs, or any real secrets.

## 2. Required Node version

- **Node.js 24** (this release was built/verified on Node `v24.13.0`).
- **pnpm 10** (verified on `10.26.1`).
- **PostgreSQL 16** for the database restore (`pg_dump`/`psql` from PostgreSQL 16).

## 3. Install dependencies

This is a pnpm workspace (monorepo). From the project root:

```bash
pnpm install
```

## 4. Environment variables

Copy the template and fill in **real** values locally (never commit it):

```bash
cp .env.example .env
```

Required:

- `DATABASE_URL` — PostgreSQL connection string.
- `JWT_SECRET` (or `SESSION_SECRET` as fallback) — secret for signing JWT auth tokens.

Optional / platform-provided: `PORT`, `BASE_PATH`, `LOG_LEVEL`, `NODE_ENV`.
Native build only: `VITE_API_BASE_URL`, `CAP_BUILD` (leave unset for web).

> The `.env.example` contains **placeholders only**. Substitute real secret values
> in your trusted environment.

## 5. Restore the database

Create an empty target database, then restore from the compressed dump:

```bash
# Create the database (adjust name/role as needed)
createdb sgma_app

# Restore (decompress on the fly). Use the DATABASE_URL or explicit flags.
gunzip -c SGMA_APP_FINAL_RELEASE_CANDIDATE_DB_2026_06_10.sql.gz | psql "$DATABASE_URL"
```

If the dump was created with `pg_dump --clean`/`--if-exists`, it will drop and
recreate objects as needed. Restore into a fresh database to avoid conflicts.

## 6. Run migrations (if needed)

The database backup already contains the full schema and data, so a fresh restore
needs no migration. If you instead start from an **empty** schema, push the Drizzle
schema (development only):

```bash
pnpm --filter @workspace/db run push
```

## 7. Start the app

Run the API server and the frontend (two processes / two workflows):

```bash
# API server (Express, port from PORT, default 5000)
pnpm --filter @workspace/api-server run dev

# Frontend (mobile-first React + Vite)
pnpm --filter @workspace/sgma-app2 run dev
```

## 8. Typecheck / build

```bash
pnpm run typecheck     # full typecheck across all packages
pnpm run build         # typecheck + build all packages
```

Regenerate API hooks/Zod schemas from the OpenAPI spec if the spec changes:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## 9. Important warnings

- **Do not commit secrets.** Keep `.env` and any real values out of version control.
- **Keep the DB backup private.** It contains member PII and password hashes.
- **Restore only in a trusted environment.** Do not restore onto shared/public hosts
  without proper access controls.
- Do not redistribute the database dump inside public documentation or screenshots.
