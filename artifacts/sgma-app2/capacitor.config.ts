import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.sgma.app",
  appName: "SGMA APP",
  webDir: "dist/public",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
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
      // Android App ID — must match AndroidManifest.xml meta-data.
      // Real ads are disabled by default; enable only after GDPR/consent review.
      // Test mode is controlled at build time via VITE_ADMOB_TEST_MODE (default: true).
      appId: "ca-app-pub-5363888403943121~7695424704",
    },
  },
};

export default config;
