import { MobileNav } from "./MobileNav";
import { BroadcastBanner } from "@/components/BroadcastBanner";
import { AdBanner } from "@/components/AdBanner";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16 min-h-[100dvh]">
      <BroadcastBanner />
      {children}
      <AdBanner />
      <MobileNav />
    </div>
  );
}
