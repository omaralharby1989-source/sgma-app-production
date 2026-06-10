# SGMA APP — Final Release Notes

**Backup date:** 2026-06-10
**Status:** Stable release candidate — captured before Android/iOS store build and any publishing-related changes.

SGMA APP is a mobile-first, bilingual (Arabic / English, full RTL) member community
web application. Authentication is JWT-based with role-based access control, built in
controlled phases.

## Major modules included

- **Authentication & membership approval** — JWT login/signup, required unique
  membership number, admin approval flow (new signups are PENDING until an admin
  activates them), role-based access control.
- **News** — published news list and detail; staff-only authoring.
- **Articles** — member-authored articles with a moderation workflow
  (draft → pending → approved/rejected), plus "my articles".
- **Chat** — polling-based public members chat and member ↔ admin-team direct chat,
  with edit and soft-delete.
- **Board of Directors (مجلس الإدارة)** — current/previous/history boards; admin
  management of member cards.
- **Volunteer Delegations (الوفود التطوعية)** — member registration form with PDF
  attachments and an admin review workflow.
- **Tasks** — internal task management with participant roles (supervisor /
  assignees / supporters), reports, attachments, status tracking, and CSV/PDF export.
- **SGMA Academy Syria** — academy module.
- **Admin / member management** — role-based admin dashboard for users, articles,
  news, broadcasts, with server-enforced permission and last-super-admin safety rules.
- **Internal broadcasts** — staff-authored broadcast banner shown to authenticated users.
- **Private partner / sponsor advertisement support** — advertisement spaces are
  private partner/sponsor placements controlled by the SGMA administration.
- **Legal / static pages** — about, privacy policy, and terms (public to read,
  developer-only to edit).

## Visual identity

- **SGMA blue identity** — brand blue (`#1E65C8`) used across the UI and splash screen.
- **Transparent 3D logo** — the final transparent 3D SGMA logo is used for the app
  icon and splash assets.

## Store preparation status

- **Ready for Android/iOS packaging** — Capacitor is integrated and the Android
  project is scaffolded and synced; icons and splash are generated from the 3D logo.
- **AdMob not yet integrated.**
- **Store build not yet finalized** — production backend URL, public privacy-policy
  URL, and the signed release build remain to be completed in the publishing step.

## Technical stack (summary)

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (mobile-first, RTL Arabic)
- API: Express 5
- Database: PostgreSQL + Drizzle ORM
- Auth: JWT (bcryptjs password hashing)
- Validation: Zod; API codegen via Orval from an OpenAPI spec
