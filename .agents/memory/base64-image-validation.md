---
name: Server-side base64 image validation
description: Why base64 data-URI image uploads must be validated on the server, not just the client.
---

Any endpoint that accepts a base64 data-URI image (avatars, board member photos, etc.) MUST validate it server-side: require a `data:<mime>;base64,<payload>` shape, restrict mime to image/jpeg|png|webp, and enforce a decoded-size cap (~2MB) computed from base64 length minus padding.

**Why:** Client-side file type/size checks are trivially bypassed by calling the API directly. A code review flagged that accepting `imageUrl` as an unrestricted string let arbitrary/oversized payloads persist within the global 8mb body limit.

**How to apply:** Mirror the same validation across create AND update handlers. Treat empty/null as "clear the image" (valid), not an error. Also harden required text fields: `min(1)` Zod still passes whitespace-only strings that then trim to empty — re-check non-empty after trim and return 400.

**Dual URL-or-base64 image fields** (news/articles `imageUrl`): when a field accepts EITHER an http(s) URL OR a base64 data URI, validate with one shared helper (`validateImageSource` in api-server `lib/imageValidation.ts`). Parse non-data values with `new URL()` and allow only `http:`/`https:` protocols — this rejects `javascript:`, `file:`, `blob:`, and `data:text/html` in one shot. The reusable frontend control is `sgma-app2/src/components/ImageInput.tsx` (URL input + file→base64 upload + preview + clear). OpenAPI `imageUrl` is already `string`, so no contract/codegen change is needed when adding base64 support.
