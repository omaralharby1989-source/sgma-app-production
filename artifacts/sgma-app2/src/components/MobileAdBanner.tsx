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

/**
 * Compute the native AdMob banner margin so it clears BOTH the app's bottom
 * navigation bar AND the Android system navigation bar (home / back / gesture
 * rail).
 *
 * Why margin: 64 was insufficient
 * ─────────────────────────────────
 * The AdMob `margin` is measured from the PHYSICAL screen bottom.
 * The app's CSS bottom nav is anchored at the VIEWPORT bottom (bottom:0 in CSS),
 * which is ABOVE the Android system nav bar. On 3-button-nav devices the system
 * bar is ~48 dp, so the physical-screen-bottom is 48 dp below the viewport
 * bottom. With margin=64, the native banner sits at 64 dp from the physical
 * bottom, which is only 64-48 = 16 dp above the viewport bottom — well inside
 * the 64 dp app nav bar.
 *
 * Correct formula:  APP_NAV_HEIGHT + system_nav_bar_height + buffer
 *
 * We measure system_nav_bar_height in three ways (most-to-least reliable):
 *   1. env(safe-area-inset-bottom) via a DOM probe element
 *   2. window.screen.height − window.visualViewport.height
 *   3. Safe constant fallback (120 dp covers 3-button nav + app nav + buffer)
 */
function calcBannerMargin(): number {
  const APP_NAV_HEIGHT = 64; // h-16 Tailwind = 64 px/dp app bottom nav
  const EXTRA_BUFFER = 8; // rounding / sub-pixel safety

  try {
    // Method 1: CSS env(safe-area-inset-bottom) — most reliable when Capacitor
    // runs in edge-to-edge mode (the recommended default for modern Android).
    const probe = document.createElement("div");
    probe.style.cssText = [
      "position:fixed",
      "bottom:0",
      "left:0",
      "width:1px",
      "height:env(safe-area-inset-bottom,0px)",
      "pointer-events:none",
      "opacity:0",
      "z-index:-9999",
    ].join(";");
    document.body.appendChild(probe);
    const sab = probe.getBoundingClientRect().height;
    document.body.removeChild(probe);

    if (sab > 0) {
      // sab is the Android system nav bar height in CSS pixels
      return APP_NAV_HEIGHT + Math.ceil(sab) + EXTRA_BUFFER;
    }
  } catch {
    /* ignore — fall through to next method */
  }

  try {
    // Method 2: difference between physical screen height and visual viewport.
    // On Android this gap equals the combined height of the status bar +
    // system nav bar. We cap at 200 to reject absurd values.
    const vvh = window.visualViewport?.height ?? window.innerHeight;
    const gap = window.screen.height - vvh;
    if (gap > 0 && gap < 200) {
      return APP_NAV_HEIGHT + Math.ceil(gap) + EXTRA_BUFFER;
    }
  } catch {
    /* ignore */
  }

  // Method 3: safe constant.
  // 120 = APP_NAV_HEIGHT (64) + typical 3-button system nav (48) + buffer (8).
  // Over-estimates on gesture-nav devices but results only in a small gap
  // between the banner and the app nav bar, which is harmless.
  return 120;
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

      const options: BannerAdOptions = {
        adId: BANNER_UNIT_ID,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        // Dynamic margin: APP_NAV_HEIGHT + Android system nav bar height.
        // calcBannerMargin() tries env(safe-area-inset-bottom) first, then
        // screen.height − visualViewport.height, then falls back to 120.
        // All three methods are computed at banner-show time so they reflect
        // the real device values rather than a compile-time constant.
        margin: calcBannerMargin(),
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

  // Spacer that keeps page content above the native overlay banner.
  // Height = bannerHeight (reported by the AdMob SDK after load).
  // The ProtectedLayout pb-16 (64px) already reserves space for the bottom
  // nav; this spacer reserves the additional banner height on top of that.
  return (
    <div
      style={{ height: bannerHeight }}
      aria-hidden="true"
      data-admob-spacer="true"
    />
  );
}
