import { MobileNav } from "./MobileNav";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16 min-h-[100dvh]">
      {children}
      <MobileNav />
    </div>
  );
}
