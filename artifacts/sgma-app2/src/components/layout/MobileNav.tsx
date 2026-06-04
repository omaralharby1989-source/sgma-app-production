import { Link, useLocation } from "wouter";
import { UserCircle, Menu, MessageSquare, Newspaper, Radio } from "lucide-react";

export function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/home", icon: UserCircle, label: "حسابي" },
    { href: "/chat", icon: MessageSquare, label: "المحادثات", disabled: true },
    { href: "/news", icon: Newspaper, label: "الأخبار", disabled: true },
    { href: "/broadcasts", icon: Radio, label: "البث", disabled: true },
    { href: "/more", icon: Menu, label: "المزيد" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card pb-safe z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const content = (
            <div className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? "text-primary" : "text-muted-foreground"} ${item.disabled ? "opacity-50" : ""}`}>
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          );

          if (item.disabled) {
            return (
              <div key={item.href} className="flex-1 h-full cursor-not-allowed">
                {content}
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="flex-1 h-full">
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
