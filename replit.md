# SGMA APP2

A mobile-first bilingual (Arabic/English) member community web app with JWT auth and role-based access control. Built in controlled phases.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/sgma-app2 run dev` — run the frontend (mobile-first React app)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (mobile-first, RTL Arabic support)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (stored in localStorage, no Firebase)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Password hashing: bcryptjs

## Where things live

- DB schema: `lib/db/src/schema/users.ts`
- OpenAPI spec: `lib/api-spec/openapi.yaml`
- Generated hooks: `lib/api-client-react/src/generated/`
- API routes: `artifacts/api-server/src/routes/`
- Auth middleware: `artifacts/api-server/src/middlewares/auth.ts`
- Frontend pages: `artifacts/sgma-app2/src/pages/`

## Architecture decisions

- JWT stored in localStorage (`sgma_auth_token`, `sgma_auth_user`) — no Firebase, no sessions
- `setAuthTokenGetter` from `@workspace/api-client-react` auto-injects token on all API calls
- Role validation happens at login — user must select the correct role to match DB role
- Password hashing uses bcryptjs (pure JS, no native bindings needed)
- Base64 data URIs stored directly for avatar images (Phase 1 — no object storage yet)

## Phase 1 Status — COMPLETE

Implemented:
- `/login` — JWT login with account/email + role selector
- `/signup` — member registration
- `/member/profile` — view/edit profile, change avatar, change password
- `/member/more` — links, logout, coming-soon placeholders
- `/developer-info` — public app info page
- Protected layout with JWT auth guard (waits for hydration before redirect)
- JWT session persists across page refreshes
- Redirect preservation from protected pages to login and back

NOT IMPLEMENTED (future phases):
- Admin dashboard (/admin) — Phase 2
- Articles/news — Phase 3
- Broadcasts/ads — Phase 5

## Chat Module Status — COMPLETE

Implemented (polling-based, 7–10s refetch; no WebSockets):
- `/chat` — center page with two cards (public chat, admin-team chat)
- `/chat/public` — public members chat room (all authenticated users)
- `/chat/admin` — member↔admin-team direct chat
  - Member view: single private thread with the admin team
  - Staff view (MODERATOR/ADMIN/SUPER_ADMIN): inbox of member conversations + reply
- Edit own messages; soft-delete (own message, or any message if staff)
- All endpoints JWT-protected; nav `/chat` enabled

Chat data model:
- `public_chat_messages` — flat room (senderId, content, isDeleted, editedAt)
- `admin_direct_chat_messages` — `conversationUserId` (owning member) + `senderId` (author). A message is "from member" when senderId === conversationUserId, else "from admin". Inbox = DISTINCT conversationUserId.
- Server NEVER trusts client senderId — always uses `req.user.userId`. Staff replies must pass `recipientId`, which must be a non-staff (member) account.

## Test Accounts

| account | email | password | role |
|---------|-------|----------|------|
| lordhygm | lordhygm@gmail.com | 123456 | SUPER_ADMIN |

## User preferences

- Phased build — do NOT implement future phases without explicit user approval
- Arabic/English bilingual (Arabic primary)
- Mobile-first design
- No Firebase — JWT only
- No duplicate auth systems

## Gotchas

- After any `lib/*` change, run `pnpm run typecheck:libs` before typechecking leaf packages
- After any OpenAPI spec change, run codegen before using updated types
- bcrypt → use `bcryptjs` (pure JS) instead of `bcrypt` (requires native build approval in Replit)
- Frontend must NOT import from `@workspace/api-zod` — that package is server-side only

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
