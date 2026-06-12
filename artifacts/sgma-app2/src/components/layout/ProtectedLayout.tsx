import { MobileNav } from "./MobileNav";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { AdBanner } from "@/components/AdBanner";
import { MobileAdBanner } from "@/components/MobileAdBanner";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16 min-h-[100dvh]">
      <BroadcastBanner />
      {children}
      <AdBanner />
      {/* MobileAdBanner: native AdMob overlay (Android/Capacitor only — no-op on web) */}
      <MobileAdBanner />
      <MobileNav />
    </div>
  );
}
