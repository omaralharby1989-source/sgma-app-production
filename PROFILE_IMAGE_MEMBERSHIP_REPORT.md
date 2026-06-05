# PROFILE IMAGE + MEMBERSHIP NUMBER REPORT

## 1. Objective
Two changes to SGMA APP2 (mobile-first bilingual Arabic member community web app):
- **(A)** Fix the profile avatar upload failure in `/home` ("حسابي").
- **(B)** Add an **optional** Membership Number (رقم العضوية / `membershipNumber`) to registration, member profile, and admin user management.

Constraint: must not break login, register, home, news, articles, chat, broadcast, admin, or more.

## 2. Avatar Bug — Root Cause
Uploading an avatar returned **HTTP 413** and the image never saved. The cause was **not** in the avatar route: `express.json()` defaults to a **100kb** body-size limit, and base64 data-URI images exceed that. The request was rejected by the global body parser **before** reaching `POST /member/avatar`.

## 3. Avatar Fix — Backend
`artifacts/api-server/src/app.ts`:
- Raised `express.json()` and `express.urlencoded()` limits to **8mb**.
- Added an `entity.too.large` error handler returning Arabic JSON `413`: a clear message instead of the default HTML error.

## 4. Avatar Fix — Frontend
`artifacts/sgma-app2/src/pages/home.tsx` (`handleAvatarUpload`):
- Client-side **type** validation (jpeg/png/webp) with Arabic toast.
- Client-side **size** validation (max 2MB) with Arabic toast.
- Narrowed file input `accept` to `image/jpeg,image/png,image/webp`.
- Resets `input.value` after each attempt (so re-selecting the same file re-triggers).
- Added `reader.onerror` handler.
- **Surfaces the server error correctly** from `err.data.error` (this codebase's fetch client puts the JSON payload on `ApiError.data`, not `err.response.data`).

## 5. Avatar Fix — Error-Extraction Bug Caught in Review
The architect review flagged that the avatar catch block initially read `err.response.data.error`, which is always `undefined` with this fetch client — so server (and the new 413) Arabic messages would never show. Fixed to `err.data?.error`, matching the pattern already used by the profile/password catch blocks in the same file.

## 6. Membership Number — Data Model
`lib/db/src/schema/users.ts`: added `membershipNumber: text("membership_number")` — **nullable**, no default. Pushed to DB via `pnpm --filter @workspace/db run push` (column created).

## 7. Membership Number — API Contract
`lib/api-spec/openapi.yaml` added `membershipNumber` to:
- `SignupInput` — optional (string)
- `MemberProfile`, `MemberProfileUpdate` — nullable
- `AdminUserItem`, `AdminUserDetail`, `AdminUpdateUserInput` — nullable

Ran `pnpm --filter @workspace/api-spec run codegen` (regenerated hooks + Zod), then `pnpm run typecheck:libs` — both succeeded.

## 8. Membership Number — Backend Wiring
- `routes/auth.ts`: `formatUser` returns `membershipNumber`; signup inserts `membershipNumber?.trim() || null`.
- `routes/member.ts`: `formatUser` returns it; `PATCH /member/profile` allows `membershipNumber` (`trim() || null`).
- `routes/admin/users.ts`: `formatUserItem` + `formatUserDetail` return it; admin `PATCH` allows it (`trim() || null`).

## 9. Membership Number — Frontend
- `register.tsx`: optional field "رقم العضوية (اختياري)", placeholder "أدخل رقم عضويتك في SGMA إن وجد"; sends `undefined` when empty (SignupInput type).
- `home.tsx`: read mode shows "غير مضاف" when empty; edit form has the field; sends `null` when empty.
- `admin/users.tsx`: edit dialog has a membership-number input; list response carries the field; sends `null` when empty.

## 10. Null vs Undefined Handling
- **Signup**: `SignupInput.membershipNumber` is optional → frontend sends `undefined` when blank (typecheck enforced this; initially sent `null` and TS rejected it).
- **Profile/Admin updates**: nullable update types → send `null` when blank, which the backend persists as SQL NULL.

## 11. Security / Regression Checks
- `role`, `isDeveloper`, `isActive`, `status` remain **server-controlled** — never trusted from client bodies (unchanged).
- Admin membership edits respect existing role protections: **ADMIN → SUPER_ADMIN PATCH still returns 403** (verified at runtime), even with a `membershipNumber` payload.
- No new authz/injection/secret issues introduced (architect: "none observed").

## 12. Verification — Typecheck
`pnpm run typecheck` (full, all packages) — **passes clean**. Caught and fixed one type error (signup `null` vs `undefined`) before completion.

## 13. Verification — Runtime (curl, via localhost:80/api)
- Signup with `membershipNumber` → persisted; returned on user + profile GET. ✅
- `PATCH /member/profile` update → persisted. ✅
- `PATCH /member/profile` with empty string → stored as `null`. ✅
- `GET /admin/users` list → includes `membershipNumber` field. ✅
- Admin `PATCH /admin/users/:id` set / `GET` detail / clear (empty→null). ✅
- ADMIN → SUPER_ADMIN `PATCH` → **403** (role protection intact). ✅

## 14. Verification — UI
Register page screenshot confirms "رقم العضوية (اختياري)" renders with the Arabic placeholder in the Personal Info section, in correct RTL layout. Frontend typecheck clean after the avatar error-extraction fix.

## 15. Docs & Memory
- `replit.md`: added "Profile Image + Membership Number Status — COMPLETE" section + a body-limit architecture note.
- Memory: added `api-error-shape-and-body-limits.md` (read errors from `err.data.error`; express body limit raised to 8mb for base64 avatars) and indexed it in `MEMORY.md`.

### Files changed
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/api-server/src/routes/member.ts`
- `artifacts/api-server/src/routes/admin/users.ts`
- `artifacts/sgma-app2/src/pages/home.tsx`
- `artifacts/sgma-app2/src/pages/register.tsx`
- `artifacts/sgma-app2/src/pages/admin/users.tsx`
- `lib/api-spec/openapi.yaml`
- `lib/db/src/schema/users.ts`
- `replit.md`, `.agents/memory/*`
