// ============================================================
// SGMA APP — AdMob Configuration
// ============================================================
// Test mode is ON by default and must remain ON until:
//   1. GDPR / consent handling is implemented
//   2. Privacy policy is updated to mention personalized ads
//   3. Explicit approval from the app owner
//
// To switch to production ads at build time:
//   VITE_ADMOB_TEST_MODE=false VITE_API_BASE_URL=https://sgma-app.org \
//     pnpm --filter @workspace/sgma-app2 run build:cap
//
// WARNING: Do NOT enable real ads before completing GDPR/consent review.
// ============================================================

// Android App ID registered in Google AdMob console.
// Must match the meta-data in AndroidManifest.xml.
export const ADMOB_ANDROID_APP_ID = "ca-app-pub-5363888403943121~7695424704";

// Google's official test banner unit — safe to use during development/QA.
// Never generates real impressions or revenue.
const TEST_BANNER_UNIT_ID = "ca-app-pub-3940256099942544/6300978111";

// Real SGMA banner unit ID — activate only after GDPR/consent review.
// TODO (BLOCKER before production ads):
//   - Add ATT / GDPR consent dialog
//   - Confirm privacy policy covers AdMob data collection
//   - Switch VITE_ADMOB_TEST_MODE=false only after the above
const REAL_BANNER_UNIT_ID = "ca-app-pub-5363888403943121/7308411896";

// VITE_ADMOB_TEST_MODE defaults to TRUE if the variable is absent or set to
// anything other than the string "false".  This ensures test-only ads ship
// unless the build explicitly opts into production ads.
export const isAdMobTestMode = import.meta.env.VITE_ADMOB_TEST_MODE !== "false";

export const BANNER_UNIT_ID = isAdMobTestMode ? TEST_BANNER_UNIT_ID : REAL_BANNER_UNIT_ID;
