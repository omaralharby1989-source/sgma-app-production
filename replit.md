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

## News Module Status — COMPLETE

Implemented (JWT-protected, members read-only):
- `/news` — image-card list of PUBLISHED news, newest first (loading skeleton / error / empty states)
- `/news/:id` — article detail with cover image, category, date, content; back to `/news`
- `GET /api/news` (published only), `GET /api/news/:id` (published only, 404 if missing)
- Staff-only writes (MODERATOR/ADMIN/SUPER_ADMIN): `POST/PATCH/DELETE /api/news` (no UI yet — API only)
- `الأخبار` enabled in bottom nav; 3 sample published items seeded

News data model (`lib/db/src/schema/news.ts`):
- Visibility is driven by `status` enum (DRAFT/PUBLISHED/ARCHIVED); only PUBLISHED is returned to clients
- `isPublished` boolean is kept in sync with `status === 'PUBLISHED'` on writes (legacy column, not the source of truth)
- API maps DB `coverImageUrl` → response field `imageUrl`; server always sets `authorId = req.user.userId`
- Malformed `:id` → 400; valid-but-missing → 404; empty PATCH body → 400

## More / Articles / Broadcast Module Status — COMPLETE

More page (`/more`) organization:
- `التطبيقات والخدمات`: المحادثات(/chat), الأخبار(/news), المقالات(/articles), معلومات المطور(/developer-info) — News and Articles are now SEPARATE items (no combined "الأخبار والمقالات")
- Staff-only section `الإدارة والإشراف` (MODERATOR/ADMIN/SUPER_ADMIN): إرسال بث → /broadcast — NEVER shown to MEMBER
- `الحساب`: تسجيل الخروج

Articles: now a FULL module — see "Articles Module Status" below (no longer a placeholder).

Broadcast:
- `/broadcast` — JWT + role protected (staffOnly); MEMBER visiting manually → redirected to /unauthorized
- Form: عنوان البث (required), نص رسالة البث (required), تاريخ انتهاء الظهور (optional date), إرسال البث
- Global `BroadcastBanner` shows active non-expired broadcasts (newest first, max 3, session-dismissible) on authenticated pages via ProtectedLayout; also embedded directly in /developer-info (public route, banner is token-guarded so renders nothing when unauthenticated). NOT on /login, /register.
- `MobileNav` shows البث tab (→/broadcast) ONLY for staff.

Broadcast endpoints (`artifacts/api-server/src/routes/broadcasts.ts`, table `broadcast_messages`):
- `GET /api/broadcasts/active` — any authenticated user; active + (no expiry OR expiry in future), newest first, limit 3
- `POST /api/broadcasts` — staff only (403 for MEMBER); server sets authorId = req.user.userId; invalid/empty title|content → 400; bad expiresAt → 400

Reusable `BackButton` (`src/components/BackButton.tsx`): default label رجوع, uses history when available, else `fallback` route prop.

## Articles Module Status — COMPLETE

Member-authored articles with a PENDING-based moderation workflow (separate from News). All routes JWT-protected (ProtectedRoute, not staffOnly):
- `/articles` — list of APPROVED articles only (loading skeleton / error / empty: "لا توجد مقالات منشورة حالياً"); buttons كتابة مقال→/articles/new, مقالاتي→/articles/my
- `/articles/:id` — detail (cover image, category, date, author, summary, content). Status badge shown ONLY to the owner. Not-found: "المقال غير موجود أو لم يعد متاحاً"
- `/articles/new` — write form (title+summary+content required, category+imageUrl optional). إرسال المقال للمراجعة → PENDING; حفظ كمسودة → DRAFT. Success: "تم إرسال المقال للمراجعة"
- `/articles/my` — own articles with status badge; REJECTED shows rejectionReason; تعديل + أرشفة only for DRAFT/PENDING
- `/articles/:id/edit` — edit own DRAFT/PENDING only; DRAFT can also be submitted for review

Route order in wouter `<Switch>`: `/articles/new`, `/articles/my`, `/articles/:id/edit` MUST precede `/articles/:id`.

Articles data model (`lib/db/src/schema/articles.ts`):
- `articleStatusEnum`: DRAFT/PENDING/APPROVED/REJECTED/ARCHIVED; `status` defaults PENDING
- Added: `category`, `reviewedById`, `rejectionReason`; legacy `isPublished`/`coverImageUrl` kept (API maps `coverImageUrl` → response `imageUrl`)

Articles security (`artifacts/api-server/src/routes/articles.ts`):
- `GET /api/articles` — APPROVED only; `GET /api/articles/my` — caller's own; `GET /api/articles/:id`
- `POST/PATCH/DELETE /api/articles` — server ALWAYS sets authorId = req.user.userId (never trusts client); create/update status clamped to DRAFT/PENDING (Zod enum + backend). Author may edit/delete ONLY own DRAFT/PENDING (else 403). DELETE = archive.
- `POST /api/articles/:id/approve` `/reject` — staff only (403 for MEMBER), backend-only (no UI); sets reviewedById + rejectionReason
- 3 sample APPROVED articles seeded

## Test Accounts

| account | email | password | role |
|---------|-------|----------|------|
| lordhygm | lordhygm@gmail.com | 123456 | SUPER_ADMIN |
| testmember | testmember@example.com | 123456 | MEMBER |

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
