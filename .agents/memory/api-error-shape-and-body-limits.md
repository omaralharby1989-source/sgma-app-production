---
name: API error shape & body-parser limits
description: How frontend reads API errors in SGMA APP2, and why express body limits were raised for base64 avatars.
---

## Frontend API error extraction
The generated React client uses a custom fetch (`lib/api-client-react/src/custom-fetch.ts`) that throws an `ApiError` whose JSON payload is on `err.data` (e.g. `err.data.error`), NOT `err.response.data`. `err.response` is a native `Response` and has no `.data`.

**How to apply:** In any catch block surfacing a server error message, read `err?.data?.error`. Writing `err.response.data.error` silently fails and falls back to the generic message.

## express body-parser limits for base64 uploads
`express.json()` defaults to a 100kb body limit. Base64 data-URI avatar uploads exceed this and get rejected with 413 *before reaching the route handler*.

**Why:** This looked like a route bug but was actually the global body parser. Symptom: avatar upload returns 413 with an HTML/plain error, route code never runs.

**How to apply:** json + urlencoded limits are raised to 8mb in `artifacts/api-server/src/app.ts`, with an `entity.too.large` error handler returning Arabic JSON 413. Avatars are additionally validated client-side (type jpeg/png/webp + 2MB). If raising the cap, keep server limit > client cap.
