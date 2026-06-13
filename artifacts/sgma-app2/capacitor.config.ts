import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.sgma.app",
  appName: "SGMA APP",
  webDir: "dist/public",
  android: {
    allowMixedContent: false,
  },
  ios: {
    // iOS-specific Capacitor settings
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: true,
  },
  server: {
    androidScheme: "https",
    // Allow the production domain in navigation (iOS ATS compatible)
    allowNavigation: ["sgma-app.org"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#1E65C8",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    AdMob: {
      // App ID must match AndroidManifest.xml (Android) and Info.plist GADApplicationIdentifier (iOS).
      // Real ads are disabled by default; enable only after GDPR/consent review is complete.
      // Test mode is controlled at web build time via VITE_ADMOB_TEST_MODE (default: true).
      appId: "ca-app-pub-5363888403943121~7695424704",
      // initializeForTesting: controlled at runtime in src/lib/admob.ts
    },
  },
};

export default config;
