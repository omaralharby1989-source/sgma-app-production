# SGMA APP2 — Phase Plan

## Overview

SGMA APP2 is a mobile-first, bilingual (Arabic/English) member community web app with JWT auth and role-based access control. Delivery is strictly phased. No phase begins without explicit approval.

---

## Phase 1 — Foundation (COMPLETE)

**Goal:** Clean foundation, full DB schema, auth system, base routes, placeholder pages.

### Frontend Routes

| Route | Component | Access |
|---|---|---|
| `/` | Redirect → `/home` or `/login` | Public |
| `/login` | Login page | Public |
| `/register` | Registration page | Public |
| `/home` | Member home/profile page | Protected (JWT) |
| `/more` | More / menu page | Protected (JWT) |
| `/developer-info` | App info page | Public |
| `/unauthorized` | 403 page | Public |
| `*` | Not found (404) | Public |

### Backend API Routes

| Method | Path | Access |
|---|---|---|
| GET | `/api/healthz` | Public |
| POST | `/api/auth/signup` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/member/profile` | JWT |
| PATCH | `/api/member/profile` | JWT |
| PATCH | `/api/member/password` | JWT |
| POST | `/api/member/avatar` | JWT |
| GET | `/api/member/stats` | JWT |
| GET | `/api/developer-info` | Public |

### Database Models (all created in Phase 1)

- **User** — id, account, email, passwordHash, fullName, role, status, isDeveloper, isActive, phone, whatsapp, birthDate, address, professionGroup, specialtyText, bio, avatarUrl, createdAt, updatedAt
- **Article** — id, title, content, summary, coverImageUrl, authorId, isPublished, publishedAt, timestamps
- **News** — id, title, content, summary, coverImageUrl, sourceUrl, authorId, isPublished, publishedAt, timestamps
- **PublicChatMessage** — id, senderId, content, isDeleted, editedAt, createdAt
- **AdminDirectChatMessage** — id, senderId, recipientId, content, isRead, isDeleted, editedAt, createdAt
- **BroadcastMessage** — id, authorId, title, content, isActive, expiresAt, timestamps
- **Advertisement** — id, authorId, title, content, imageUrl, linkUrl, isActive, expiresAt, timestamps
- **DeveloperInfo** — id, appName, version, developer, description, contact, builtWith, isActive, updatedAt

### Auth System

- JWT stored in `localStorage` (keys: `sgma_auth_token`, `sgma_auth_user`)
- No Firebase, no sessions, no Passport
- Password hashing: `bcryptjs` (pure JS — required for Replit)
- Role validated at login — user must select matching role
- Token expiry: 7 days

### Roles

| Role | Arabic |
|---|---|
| MEMBER | عضو |
| MODERATOR | مشرف |
| ADMIN | مدير |
| SUPER_ADMIN | مدير عام |

---

## Phase 2 — Admin Membership Management (PENDING APPROVAL)

**Goal:** Admin dashboard for managing members (view, activate, suspend, promote, search).

- Route: `/admin`
- Protected: ADMIN, SUPER_ADMIN only → redirect to `/unauthorized` for others
- Features: member list, search/filter, view profile, change status, change role
- Backend: admin-only API routes with role guard middleware

---

## Phase 3 — Articles & News (PENDING APPROVAL)

**Goal:** Publish and read articles and news items.

- Routes: `/articles`, `/articles/:id`, `/news`, `/news/:id`
- Protected reading: JWT required
- Writing: MODERATOR, ADMIN, SUPER_ADMIN only
- DB models already created in Phase 1 (Article, News)

---

## Phase 4 — Chat (PENDING APPROVAL)

**Goal:** Two chat systems — public community chat and admin direct messaging.

### Public Chat

- Route: `/chat`
- All authenticated members can read and send
- Mobile-first internal scroll (WhatsApp/Messenger style)
- Messages: text only (Phase 4), attachments in later phase
- Edit: sender can edit own messages (shows "edited" label)
- Delete: sender can soft-delete own messages; MODERATOR/ADMIN can delete any
- Real-time: WebSocket or SSE
- DB model: PublicChatMessage (already in DB)

### Admin Direct Chat

- Route: `/admin/chat/:userId`
- ADMIN/SUPER_ADMIN initiates; MEMBER receives
- Private, one-on-one
- Same WhatsApp/Messenger-style UI
- Unread badge count for admins
- DB model: AdminDirectChatMessage (already in DB)

---

## Phase 5 — Broadcasts & Advertisements (PENDING APPROVAL)

**Goal:** System-wide broadcast messages and advertisements shown on authenticated pages.

### Broadcast Messages

- Appears at the **top** of all authenticated pages (above content)
- Can be published by: MODERATOR, ADMIN, SUPER_ADMIN
- MEMBER cannot publish
- Auto-expires (expiresAt field)
- DB model: BroadcastMessage (already in DB)
- Admin management route: `/admin/broadcasts`

### Advertisements

- Appears at the **bottom** of all authenticated pages (above mobile nav)
- Does **NOT** appear on `/login` or `/register`
- Can be published by: MODERATOR, ADMIN, SUPER_ADMIN
- MEMBER cannot publish
- Supports image + link URL
- Auto-expires (expiresAt field)
- DB model: Advertisement (already in DB)
- Admin management route: `/admin/advertisements`

---

## Guiding Principles

1. **Phased delivery** — no phase starts without explicit approval
2. **Arabic primary** — all user-facing text in Arabic first
3. **Mobile-first** — all layouts designed for mobile (375px+)
4. **No Firebase** — JWT only
5. **No route chaos** — routes are documented here and kept clean
6. **DB schema first** — models created early even if UI is deferred
