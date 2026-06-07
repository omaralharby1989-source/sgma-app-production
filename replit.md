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
- API body-parser limits raised to 8mb (json + urlencoded) so base64 avatar uploads aren't rejected with 413 before reaching the route; an `entity.too.large` handler returns Arabic JSON 413

## Profile Image + Membership Number Status — COMPLETE

Avatar upload fix:
- Root cause was `express.json()` default 100kb limit → 413 before the route. Fixed in `artifacts/api-server/src/app.ts` (limits → 8mb + Arabic 413 handler)
- `home.tsx` avatar upload: client-side type (jpeg/png/webp) + 2MB validation with Arabic toasts; reads server error from `err.data.error` (NOT `err.response.data` — this fetch client puts the payload on `ApiError.data`); resets `input.value`; `reader.onerror` handled

Membership Number (`membershipNumber` / رقم العضوية) — REQUIRED at signup, UNIQUE, read-only for members:
- DB: `membership_number` text column on `users` with a UNIQUE constraint (`users_membership_number_unique`). Still nullable (Postgres allows multiple NULLs; admin-created/edited values may be cleared to null).
- OpenAPI: `SignupInput.membershipNumber` is REQUIRED (minLength 1); present on MemberProfile, AdminUserItem, AdminUserDetail, AdminUpdateUserInput. REMOVED from MemberProfileUpdate (members can no longer edit it).
- Backend signup: rejects empty membership with Arabic 400 ("الرجاء إدخال رقم العضوية"); duplicate → Arabic 409 ("رقم العضوية مستخدم بالفعل"); 23505 unique-violation also mapped to 409 as a race-condition fallback.
- Backend member PATCH: does NOT accept membershipNumber (read-only). Backend admin PATCH: accepts it with a duplicate check excluding the target (`ne(id)`) → 409.
- Frontend: register form required field; `/home` profile shows it READ-ONLY (display "غير مضاف" when empty, no edit input); `/admin/users` edit dialog still edits it.

## Account Approval Flow — COMPLETE

New signups are NOT auto-activated. They must be approved by an admin before they can log in.
- Signup (`POST /auth/signup`): inserts `status=PENDING`, `isActive=false`, role MEMBER; issues NO JWT. Returns `SignupResponse { message, status }` (201) — NOT AuthResponse. Frontend shows an Arabic "request submitted, pending approval" toast and redirects to `/login` (does not store any token).
- Login (`POST /auth/login`) status gate, in order: password → role match → PENDING blocked ("حسابك قيد المراجعة. سيتم تفعيله بعد التحقق من رقم العضوية من قبل الإدارة.") → SUSPENDED or `!isActive` blocked ("تم إيقاف حسابك، يرجى التواصل مع الإدارة.") → only ACTIVE + isActive get a JWT.
- Admin `/admin/users`: `status` query-param filter (All/Pending/Active/Suspended); status badges; membershipNumber shown per row; one-tap "تفعيل الحساب" button (PATCH `status=ACTIVE, isActive=true`) for PENDING/inactive users.
- SAFETY: because PENDING now blocks login, admin guards treat ANY non-login-eligible result (`isActive=false` OR `status !== ACTIVE`) as "deactivation". Last-super-admin guards count only LOGIN-ELIGIBLE supers (`role=SUPER_ADMIN AND status=ACTIVE AND is_active=true`) via `countLoginEligibleSupers()`. Cannot self-deactivate (incl. self→PENDING) or demote/deactivate the last login-eligible super admin.

## Developer Info Module Status — COMPLETE

`/developer-info` is now a developer-PERSON card (repurposed from the old app-info page), public + editable by the real developer only:
- `GET /api/developer-info` — PUBLIC (no auth). Returns `{ id, name, title, description, roleDescription, phone, email, updatedAt, updatedById }`. Self-seeds the single active record on a fresh DB via `ensureInfoRow()` so the public card never 404s.
- `PATCH /api/developer-info` — JWT-protected; editable ONLY by the developer account. Backend resolves `req.user.userId` → DB user and requires `user.email === "lordhygm@gmail.com" AND user.isDeveloper === true`. SUPER_ADMIN/ADMIN/MODERATOR/MEMBER without isDeveloper → 403. Server NEVER trusts client role. Invalid body → 400, no token → 401.
- Single active `developer_info` record (no history). Person fields (`name/title/phone/email/role_description/updated_by_id`) were ADDED as nullable columns alongside legacy app-info columns (kept, non-destructive); `description` reused for the professional description.
- Frontend `/developer-info`: professional RTL card, NO photo (icon placeholder), shows name/title/professional description/الدور في SGMA/phone/email + اتصال هاتفي (tel:) and إرسال بريد إلكتروني (mailto:) buttons. Edit button (تعديل معلومات المطور) shown ONLY when `isDeveloperUser(getStoredUser())` (email===lordhygm AND isDeveloper). Edit form validates required fields + email format; success toast "تم تحديث معلومات المطور بنجاح".
- `StoredUser` extended with optional `email`/`isDeveloper` (login already stores full user). `lib/auth.ts` exports `isDeveloperUser()`.
- Removed `routes/public.ts` (it only held the old GET); GET+PATCH now live in `routes/developer-info.ts`.
- NOTE: developer-info edit permission is gated on email+isDeveloper from DB, NOT role — SUPER_ADMIN alone is NOT enough.

## Legal / About Pages Module — COMPLETE

Three editable static informational pages under `/more`, public to read, developer-only to edit (same identity gate as developer-info):
- Routes (public, listed before ProtectedRoute in `App.tsx`): `/about-sgma`, `/privacy-policy`, `/terms`. One reusable component `pages/static-page.tsx` takes a `slug` prop.
- `/more` has a new section `القانونية والمعلومات` with من نحن(/about-sgma), سياسة الخصوصية(/privacy-policy), الشروط والأحكام(/terms). All existing `/more` items kept.
- DB: `static_pages` table (`lib/db/src/schema/staticPages.ts`) — `id`, `slug` UNIQUE, `title`, `content`, `updated_by_id`, `updated_at`. ALLOWED slugs only: `privacy-policy`, `terms`, `about-sgma`.
- `GET /api/static-pages/:slug` — PUBLIC. Self-seeds the canonical row per slug via `ensurePageRow()` (uses `onConflictDoNothing` on the unique slug, so no duplicate rows on restart/race). Unknown slug → 404.
- `PATCH /api/static-pages/:slug` — JWT-protected; editable ONLY by the developer account (DB lookup: `email === "lordhygm@gmail.com" AND isDeveloper === true`). Non-developer (incl. ADMIN/SUPER_ADMIN without isDeveloper) → 403; no token → 401; invalid body → 400; unknown slug → 404. Edits `title` + `content` only; sets `updatedById`.
- Frontend: professional RTL card layout, `whitespace-pre-line` content (seed text uses real newlines for numbered sections), آخر تحديث date, BackButton(fallback=/more), BroadcastBanner. Edit button (تعديل الصفحة) shown ONLY when `isDeveloperUser(getStoredUser())`. Success toast "تم تحديث الصفحة بنجاح".
- OpenAPI: `StaticPage` + `UpdateStaticPageInput` schemas, `GET/PATCH /static-pages/{slug}` paths → generated `UpdateStaticPageBody` (zod) + `useGetStaticPage`/`useUpdateStaticPage`/`getGetStaticPageQueryKey` (react).
- NOTE: login request field is `identifier` (not `account`); login response is `AuthResponse { token, user }`.

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

## Admin Dashboard Module Status — COMPLETE

Role-based admin module; backend is the source of truth for ALL permissions (UI gating is convenience only):
- `/admin` — dashboard with stats cards (staff: MODERATOR/ADMIN/SUPER_ADMIN). User/role counts gated to ADMIN/SUPER_ADMIN only.
- `/admin/users` — ADMIN/SUPER_ADMIN only; search + role filter, edit profile/role/status
- `/admin/articles` — staff; status filter, approve/reject/archive
- `/admin/news` — staff; status filter, create/edit
- `/admin/broadcasts` — ADMIN/SUPER_ADMIN only; create/edit/delete

Role matrix:
- SUPER_ADMIN: everything
- ADMIN: everything EXCEPT cannot act on SUPER_ADMIN targets, cannot assign ADMIN/SUPER_ADMIN (can assign up to MODERATOR)
- MODERATOR: ONLY articles + news (NOT users, NOT broadcasts)
- MEMBER: no access → redirected to /unauthorized

Permission helpers (`artifacts/api-server/src/lib/permissions.ts`): isStaff, isAdminOrSuper, isSuperAdmin, canActOnUser, canChangeRole, assignableRoles.

Critical safety rules (enforced in `routes/admin/users.ts` PATCH):
- Cannot change your OWN role; cannot deactivate/suspend your OWN account
- Cannot demote the last ACTIVE super admin; cannot deactivate the last ACTIVE super admin (both count `role=SUPER_ADMIN AND is_active=true` — active-only, not total)
- Server never trusts client role/authorId — uses req.user

Regression note: `POST /api/broadcasts` was TIGHTENED from staff (incl. MODERATOR) to ADMIN/SUPER_ADMIN only. Frontend `/broadcast` route + nav restricted to ADMIN/SUPER_ADMIN accordingly.

Admin routes live in `artifacts/api-server/src/routes/admin/` (index, stats, users, articles, news, broadcasts), registered via `routes/index.ts`. Frontend pages in `artifacts/sgma-app2/src/pages/admin/`. ProtectedRoute supports `allowedRoles?: string[]`.

## Board of Directors Module Status — COMPLETE

مجلس الإدارة — read for any authenticated user, manage (create/edit/soft-delete) for ADMIN/SUPER_ADMIN only (MODERATOR + MEMBER are view-only):
- `/board` — landing with 3 cards: المجلس الحالي(/board/current), المجالس السابقة(/board/previous), تاريخ المجلس(/board/history). All ProtectedRoute (any authenticated role).
- `/board/current` — member cards (image or initials fallback); ADMIN/SUPER_ADMIN see add/edit dialog (base64 image upload + active Switch) and a soft-delete AlertDialog. Previous/history are placeholders.
- `/more` section renamed to `الجمعية والمعلومات`: من نحن / مجلس الإدارة / سياسة الخصوصية / الشروط والأحكام / معلومات المطور (معلومات المطور moved here).

Board data model (`lib/db/src/schema/boardMembers.ts`, table `board_members`):
- Columns: id, name, position, bio, phone, email, imageUrl, boardType (text, default CURRENT), displayOrder, isActive, createdById, updatedById, createdAt, updatedAt.
- `boardType` is a plain text column (CURRENT/PREVIOUS/HISTORY validated in code), NOT a Postgres enum.

Board security/validation (`artifacts/api-server/src/routes/board.ts`):
- Writes gated on `isAdminOrSuper(req.user.role)` read straight from the JWT — role is in the JWT, no DB lookup needed → 403 for MEMBER/MODERATOR.
- Server ALWAYS sets created/updatedById from `req.user.userId` (never trusts client).
- Soft-delete: DELETE sets `isActive=false`; GET list + detail return active members only.
- `ensureSeeded()` inserts 3 sample CURRENT members ONLY when the table is completely empty (count=0) — never re-seeds after an admin deactivates members.
- Backend validation (NOT just frontend): required `name/position/bio` rejected as 400 if whitespace-only after trim; optional `email` must match email format; `imageUrl` must be a base64 data URI with mime image/jpeg|png|webp and ≤2MB decoded — bypassing the UI with raw payloads is rejected.
- Express 5: coerce `req.params.id` with `Number()` and guard `Number.isInteger` → 400 on bad id; valid-but-missing → 404.

Codegen note: zod bodies are `CreateBoardMemberBody`/`UpdateBoardMemberBody` (NOT ...Input); react types are `CreateBoardMemberInput`/`UpdateBoardMemberInput`/`BoardMember`; hooks `useGetBoardMembers`/`useGetBoardMember`/`useCreateBoardMember`/`useUpdateBoardMember`/`useDeleteBoardMember`/`getGetBoardMembersQueryKey`.

## Volunteer Delegations Module Status — COMPLETE

Additive module for registering volunteer medical delegations (تسجيل للوفود التطوعية). DB: `volunteer_delegation_requests` + `volunteer_delegation_files` (`lib/db/src/schema/volunteerDelegations.ts`); `status` is plain text (SUBMITTED/IN_REVIEW/ACCEPTED/REJECTED/ARCHIVED), dates stored as text.
- Member routes (`routes/volunteer-delegations.ts`, JWT): `POST /volunteer-delegations` (ACTIVE-only gate via `req.user.status`), `GET /volunteer-delegations/my`, `GET /volunteer-delegations/files/:fileId` (STRICTLY owner-only — staff use the admin endpoint, no staff bypass).
- Admin routes (`routes/admin/volunteer-delegations.ts`, staff only via `isStaff`): `GET /admin/volunteer-delegations?status=`, `GET /admin/volunteer-delegations/:id`, `PATCH /admin/volunteer-delegations/:id` (status + adminNotes, sets reviewedById), `GET /admin/volunteer-delegations/files/:fileId`. `files/:fileId` is registered BEFORE `:id` to avoid shadowing.
- Server NEVER trusts client userId/role: `userId`/`reviewedById` always from `req.user`. Backend validation: required-field trim, email regex, from≤to date range, conditional `equipmentDetails`, PDF-only mime + ≤5MB decoded each + ≤5 files (`lib/pdfValidation.ts`).
- PDF attachments stored as base64 data URIs; file endpoints return JSON `{id,fileName,mimeType,fileSize,fileData}`, client builds a Blob/anchor download. `app.ts` json+urlencoded limit raised 8mb→40mb to fit up to 5×5MB base64 PDFs.
- Frontend: `/volunteer-delegations` (member 14-field RTL form + conditional equipment details + PDF upload with client type/size/count checks + "حفظ كـ PDF / طباعة" via window.open print, NOT submit + "طلباتي" list); `/admin/volunteer-delegations` (staffOnly: cards, status filter, badges, PDF download, update dialog). Success msg: "تم تسجيل طلب عملك التطوعي، سيتم التواصل معك لترتيب الإجراءات. شكراً جزيلاً." `/more` links: member "تسجيل للوفود التطوعية", staff "طلبات الوفود التطوعية".

## Task Management Module Status — COMPLETE

Internal Trello-like task module (no drag/drop). Staff (MODERATOR/ADMIN/SUPER_ADMIN) create/assign tasks to MEMBERs, track progress, add admin notes, change status, download attachments, export CSV+PDF. Members see ONLY assigned tasks and submit reports with device-uploaded attachments. Backend is the source of truth for ALL permissions; UI gating is convenience only.
- DB (`lib/db/src/schema/tasks.ts`): `tasks`, `task_assignees`, `task_reports`, `task_report_attachments`. Statuses NEW/IN_PROGRESS/WAITING_REVIEW/COMPLETED/POSTPONED/CANCELLED; priorities LOW/MEDIUM/HIGH/URGENT; report types MEMBER_REPORT/ADMIN_NOTE.
- Member/shared routes (`routes/tasks.ts`, JWT): `GET /tasks/my` (assigned only), `GET /tasks/:id` (assignee or staff only), `POST /tasks/:id/reports`, `GET /tasks/reports/attachments/:attachmentId`. Static `reports/attachments` path registered BEFORE `:id`.
- Admin routes (`routes/admin/tasks.ts`, staff only): `GET /admin/tasks?status=&priority=`, `GET /admin/tasks/export` (CSV rows), `GET /admin/tasks/assignable-users`, `POST /admin/tasks`, `PATCH /admin/tasks/:id`. Static `export`/`assignable-users` registered BEFORE `:id`.
- SECURITY (server-enforced, never trust client):
  - Assignees MUST be `role=MEMBER` AND ACTIVE AND isActive — both `activeUserIds()` (create/reassign) and `assignable-users` filter on role=MEMBER; assigning a non-member → 400. Staff cannot assign tasks to staff.
  - Report type is forced by ACTOR ROLE, client `reportType` is ignored: staff → ALWAYS ADMIN_NOTE, member → ALWAYS MEMBER_REPORT. Only a MEMBER_REPORT on a NEW/IN_PROGRESS task auto-transitions it to WAITING_REVIEW — staff cannot spoof that transition.
  - Attachment download (`/tasks/reports/attachments/:id`): members get ONLY their own (`row.authorId !== req.user.userId` → 403); staff bypass allowed. There is NO separate admin attachment route — staff use this shared endpoint (frontend `getTaskReportAttachment` for both).
  - `authorId`/`assignedById`/`reviewedById` always from `req.user`, never client.
- Attachment validation (`lib/taskAttachmentValidation.ts`): pdf + jpeg/png/webp only, ≤5 files, ≤5MB decoded each; base64 data URIs.
- Frontend: `/tasks` (مهامي list, empty="لا توجد مهام مكلّف بها حالياً"), `/tasks/:id` (role-aware: member report+progress+upload / staff admin-note + status change), `/admin/tasks` (filters, cards, CSV w/ UTF-8 BOM + print PDF title "تقرير المهام"), `/admin/tasks/new` (Checkbox multi-select assignees). `src/lib/taskLabels.ts` holds status/priority labels+variants+formatTaskDate. `/more` shows مهامي ONLY when `!isStaff && hasTasks`, إدارة المهام for staff. Routes: `/admin/tasks/new` BEFORE `/admin/tasks`.

## Test Accounts

| account | email | password | role |
|---------|-------|----------|------|
| lordhygm | lordhygm@gmail.com | 123456 | SUPER_ADMIN |
| testadmin | (signup) | 123456 | ADMIN |
| testmod | (signup) | 123456 | MODERATOR |
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
