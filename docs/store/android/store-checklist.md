# SGMA APP — Google Play Store Checklist (Android)

Package: `org.sgma.app` · App name: **SGMA APP** / **تطبيق سِجما** · Build tool: Capacitor

Legend: ✅ ready · ⚠️ needs input/manual step · ⛔ blocker before submission

## 1. Listing metadata
| Item | Status | Notes |
|---|---|---|
| App name (EN) | ✅ | `app-name-en.txt` → SGMA APP |
| App name (AR) | ✅ | `app-name-ar.txt` → تطبيق سِجما |
| Short description (AR) | ⚠️ | `short-description-ar.txt` — verify ≤ 80 chars in Play console |
| Full description (AR) | ✅ | `full-description-ar.txt` |
| Full description (EN) | ✅ | `full-description-en.txt` |
| Category | ⚠️ | Suggested: **Medical** (or Lifestyle/Social). Choose in console. |
| Release notes (AR/EN) | ✅ | `release-notes-ar.txt`, `release-notes-en.txt` |

## 2. Graphics
| Item | Status | Notes |
|---|---|---|
| App icon (512×512) | ✅ | Adaptive icon generated from final 3D SGMA logo (foreground + brand-blue background, 16.7% safe inset). For the Play listing 512×512 PNG you can reuse `public/sgma-app-icon.png` or export from the logo. |
| Feature graphic (1024×500) | ✅ | `graphics/feature-graphic-1024x500.png` — SGMA branded, blue gradient, Arabic headline, exact 1024×500 px PNG. |
| Phone screenshots (≥2, up to 8) | ✅ | 6 PNG screenshots captured (780×1688 px): login, home, news, articles, board, more. See `screenshots/`. |
| Tablet screenshots | ⚠️ | Optional but recommended. |

## 3. Policy & compliance
| Item | Status | Notes |
|---|---|---|
| Privacy policy URL | ✅ | `privacy-policy-url.txt` — public HTTPS URL provided: https://sgma-med.org/de/privacy-policy (verified reachable, HTTP 200, no login). |
| Data safety form | ⚠️ | Declare: account data (name, email, membership number), user content (messages, articles), photos (avatar). Data is collected, transmitted to the app's own backend over HTTPS, used for app functionality. No third-party ad SDK. |
| Content rating questionnaire | ⚠️ | Complete in console. App has user-generated content + chat → rating likely Teen/PEGI 12; answer honestly. |
| Target audience & content | ⚠️ | Target adults (members). Not directed at children. |
| Ads declaration | ⚠️ (update needed) | AdMob SDK (`@capacitor-community/admob` v8) is now integrated. **Update data safety form** to declare Google AdMob. Current build uses **test ads only** (`VITE_ADMOB_TEST_MODE=true`). Real ads blocked until GDPR/consent review. |

## 4. Access for review
| Item | Status | Notes |
|---|---|---|
| App access instructions | ✅ | `app-access-instructions.txt` — full English instructions with demo credentials, accessible pages, blocked pages, production URL, privacy policy. |
| Reviewer login credentials | ✅ | Demo MEMBER account created: `playreviewer@sgma-app.org` / `PlayReview2026!Sgma` — ACTIVE, role=MEMBER, no admin access (verified 403 on all /admin endpoints). |
| Closed testing | ⚠️ | New personal developer accounts: **12 testers opted-in for 14 continuous days** required before production access. Set up a closed test track. |

## 5. Build & signing
| Item | Status | Notes |
|---|---|---|
| Package name | ✅ | `org.sgma.app` (applicationId + namespace set). |
| Capacitor config | ✅ | `capacitor.config.ts` (webDir `dist/public`). |
| Android project | ✅ | `android/` scaffolded + synced. |
| AAB build | ⛔ (env) | Cannot build here — no JDK/Gradle/Android SDK. Build in Android Studio or CI (commands below). |
| Play App Signing | ⚠️ | Recommended: enroll in Play App Signing; upload key generated at first AAB build (`keytool`/Android Studio). Keep keystore secret — never commit it. |

## Exact build commands (Android Studio / CI with JDK 17 + Android SDK)

Final production API base URL: **`https://sgma-app.org`** (custom domain, verified 2026-06-12 — health check `https://sgma-app.org/api/healthz` returns `{"status":"ok"}`).

```bash
# from repo root — production build with real ads DISABLED (test mode, default)
VITE_API_BASE_URL=https://sgma-app.org VITE_ADMOB_TEST_MODE=true \
  pnpm --filter @workspace/sgma-app2 run build:cap
pnpm --filter @workspace/sgma-app2 exec cap sync android
cd artifacts/sgma-app2/android
./gradlew assembleDebug      # debug APK (sanity check)
./gradlew bundleRelease      # release AAB for Google Play  -> app/build/outputs/bundle/release/

# To enable real ads (only after GDPR/consent review is complete):
# VITE_API_BASE_URL=https://sgma-app.org VITE_ADMOB_TEST_MODE=false \
#   pnpm --filter @workspace/sgma-app2 run build:cap
```

> **Note:** Android Studio / JDK 17 / Gradle / Android SDK are required for the AAB build step.
> The Replit environment does not have these tools — build the AAB on a machine with Android Studio or in CI.

For a signed release, configure a keystore (or use Play App Signing) before `bundleRelease`.

## Blockers summary
- ✅ Public production **backend/API URL** — `VITE_API_BASE_URL=https://sgma-app.org` (final domain verified 2026-06-12).
- ✅ Public **privacy policy URL** — https://sgma-med.org/de/privacy-policy (HTTPS, HTTP 200).
- ✅ **Feature graphic** — `graphics/feature-graphic-1024x500.png` (exact 1024×500 px PNG).
- ✅ **Phone screenshots** — 6 PNG files in `screenshots/` (780×1688 px, no private data).
- ✅ **Demo reviewer account** — `playreviewer@sgma-app.org`, MEMBER, ACTIVE (verified login + admin blocked).
- ✅ **App access instructions** — `app-access-instructions.txt` (English, ready to paste into Play console).
- ✅ **AdMob** — test banner integrated; real ads blocked by default until GDPR/consent review.
- ⛔ **AAB build** — must be built in Android Studio / CI (JDK 17 + Gradle + Android SDK — not in Replit).
- ⚠️ **GDPR / consent dialog** — required before enabling real AdMob ads (`VITE_ADMOB_TEST_MODE=false`).
- ⚠️ **Data safety form** — update in Play console to declare AdMob SDK.
- ⚠️ **Closed testing run** — 12 testers opted-in for 14 continuous days (new developer account requirement).
- ⚠️ **Play App Signing keystore** — generate and keep private before `bundleRelease`.
- ⚠️ **Tablet screenshots** — optional but recommended for higher quality listing.
