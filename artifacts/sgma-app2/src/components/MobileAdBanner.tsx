// ============================================================
// MobileAdBanner — Google AdMob banner for Capacitor/Android only
//
// Behaviour:
//  - On web/PWA: renders nothing, no crash (graceful no-op)
//  - On native:  shows a native overlay banner at the bottom
//  - Renders a spacer div so content is never covered by the banner
//  - Route-gated: only shows on allowed content pages
//  - Forbidden on: login, register, admin, academy, chat, profile, forms
// ============================================================

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  AdMob,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
  BannerAdPluginEvents,
  AdMobBannerSize,
} from "@capacitor-community/admob";
import { useLocation } from "wouter";
import { BANNER_UNIT_ID, isAdMobTestMode } from "@/lib/admob";

// Routes where the AdMob banner is ALLOWED to appear.
// Keep this list conservative: general content only.
function isBannerAllowed(path: string): boolean {
  if (path === "/home") return true;
  if (path.startsWith("/news")) return true;
  if (path.startsWith("/articles")) return true;
  if (path.startsWith("/board")) return true;
  if (path === "/more") return true;
  if (
    path === "/about-sgma" ||
    path === "/privacy-policy" ||
    path === "/terms" ||
    path === "/developer-info"
  )
    return true;
  // Everything else is blocked:
  // /login, /register — auth screens
  // /admin/** — admin dashboard and all sub-pages
  // /academy/** — protected academy / video pages
  // /chat/** — chat input usability
  // /member/** — private profile/data screens
  // /tasks/**, /volunteer-delegations — forms / task screens
  // /broadcast — staff-only
  return false;
}

let adMobInitialized = false;

async function ensureAdMobInit(): Promise<void> {
  if (adMobInitialized) return;
  adMobInitialized = true;
  try {
    await AdMob.initialize({
      testingDevices: [],
      initializeForTesting: isAdMobTestMode,
    });
  } catch {
    // Initialization failure must not crash the app
    adMobInitialized = false;
  }
}

export function MobileAdBanner() {
  const [location] = useLocation();
  const [bannerHeight, setBannerHeight] = useState(0);
  const listenerRef = useRef<{ remove: () => void } | null>(null);

  const isNative = Capacitor.isNativePlatform();
  const allowed = isBannerAllowed(location);

  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;

    async function showBanner() {
      await ensureAdMobInit();
      if (cancelled) return;

      if (!allowed) {
        try {
          await AdMob.removeBanner();
        } catch {
          // ignore
        }
        setBannerHeight(0);
        return;
      }

      // Listen for banner size so we can add the correct spacer height
      try {
        const listener = await AdMob.addListener(
          BannerAdPluginEvents.SizeChanged,
          (info: AdMobBannerSize) => {
            if (!cancelled) setBannerHeight(info.height ?? 50);
          },
        );
        listenerRef.current = listener;
      } catch {
        // Fall back to a standard 50dp spacer if listener fails
        setBannerHeight(50);
      }

      // margin: 64 = h-16 MobileNav height. This positions the native overlay
      // banner immediately above the bottom nav bar so they do not overlap.
      // The ProtectedLayout's pb-16 + the spacer div together reserve exactly
      // (64 + bannerHeight) px at the bottom of the scroll area, matching this.
      const options: BannerAdOptions = {
        adId: BANNER_UNIT_ID,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 64,
        isTesting: isAdMobTestMode,
      };

      try {
        await AdMob.showBanner(options);
      } catch {
        // Banner failed to load — app continues normally, no spacer shown
        setBannerHeight(0);
      }
    }

    showBanner();

    return () => {
      cancelled = true;
      listenerRef.current?.remove();
      listenerRef.current = null;
      AdMob.removeBanner().catch(() => {});
      setBannerHeight(0);
    };
    // NOTE: `location` is intentionally omitted from deps.
    // Both allowed states and the location that affects them (isBannerAllowed)
    // are captured via `allowed`. Re-running on every navigation between two
    // allowed routes (e.g. /news → /news/1) would call removeBanner() +
    // showBanner() in rapid succession, crashing the AdMob SDK on Android.
  }, [isNative, allowed]);

  // Web/PWA: render nothing
  if (!isNative) return null;
  // Allowed route with no banner loaded yet: render nothing
  if (bannerHeight === 0) return null;

  // Spacer that keeps page content above the native overlay banner,
  // preventing the bottom navigation from being covered.
  return (
    <div
      style={{ height: bannerHeight }}
      aria-hidden="true"
      data-admob-spacer="true"
    />
  );
}
