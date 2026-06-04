---
name: SGMA APP2 auth system
description: JWT auth setup, bcryptjs requirement, role validation behavior
---

## JWT Auth
- Token stored in localStorage: `sgma_auth_token` (JWT string)
- User stored in localStorage: `sgma_auth_user` (JSON)
- `setAuthTokenGetter(() => localStorage.getItem("sgma_auth_token"))` called at App module level
- JWT_SECRET env var or fallback in `artifacts/api-server/src/middlewares/auth.ts`
- Token expires in 7d

## bcryptjs (not bcrypt)
- Use `bcryptjs` (pure JS) not `bcrypt` (requires native build approval in Replit)
- `bcrypt` gives "Ignored build scripts" warning and doesn't work

**Why:** Replit's pnpm sandbox blocks native build scripts by default.

## Role validation
- Login requires user to select role; backend rejects if DB role doesn't match
- Status SUSPENDED → 403 error

## Protected routes
- `ProtectedRoute` component in App.tsx checks localStorage after useEffect (not at render time)
- Shows spinner while checking, then redirects to /login if no token
