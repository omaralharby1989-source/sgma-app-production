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
| Feature graphic (1024×500) | ⚠️ | Not generated — create a 1024×500 banner with SGMA branding before submission. |
| Phone screenshots (≥2, up to 8) | ⚠️ | See `screenshots/` — add real device screenshots (login + main screens). Min 2 required. |
| Tablet screenshots | ⚠️ | Optional but recommended. |

## 3. Policy & compliance
| Item | Status | Notes |
|---|---|---|
| Privacy policy URL | ✅ | `privacy-policy-url.txt` — public HTTPS URL provided: https://sgma-med.org/de/privacy-policy (verified reachable, HTTP 200, no login). |
| Data safety form | ⚠️ | Declare: account data (name, email, membership number), user content (messages, articles), photos (avatar). Data is collected, transmitted to the app's own backend over HTTPS, used for app functionality. No third-party ad SDK. |
| Content rating questionnaire | ⚠️ | Complete in console. App has user-generated content + chat → rating likely Teen/PEGI 12; answer honestly. |
| Target audience & content | ⚠️ | Target adults (members). Not directed at children. |
| Ads declaration | ✅ (decision) | Declare **No ads** for this build — no ad SDK integrated. Internal/private partner spaces are app content, not an ad network. Revisit if/when AdMob is added. |

## 4. Access for review
| Item | Status | Notes |
|---|---|---|
| App access instructions | ⚠️ | App requires an approved membership login. Provide reviewer instructions + demo credentials. |
| Reviewer login credentials | ⚠️ | Use DEMO accounts only (never real admin/super-admin or member PII). Create/confirm a dedicated demo MEMBER (and optionally demo staff) account before review and paste here. |
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
```bash
# from repo root
pnpm --filter @workspace/sgma-app2 run build:cap   # production web build (relative base)
pnpm --filter @workspace/sgma-app2 exec cap sync android
cd artifacts/sgma-app2/android
./gradlew assembleDebug      # debug APK (sanity check)
./gradlew bundleRelease      # release AAB for Google Play  -> app/build/outputs/bundle/release/
```
For a signed release, configure a keystore (or use Play App Signing) before `bundleRelease`.

## Blockers summary
- ⛔ Public production **backend/API URL** — set `VITE_API_BASE_URL` at build time (the app is wired for it; value not provided).
- ✅ Public **privacy policy URL** — provided: https://sgma-med.org/de/privacy-policy (HTTPS, public, verified HTTP 200).
- ⛔ **AAB** — must be built where Android tooling exists.
- ⚠️ Feature graphic, screenshots, demo reviewer credentials, closed-testing run.
