import { Link, useLocation } from "wouter";
import { UserCircle, Menu, MessageSquare, Newspaper, LayoutDashboard, GraduationCap } from "lucide-react";
import { getStoredUser, isStaffRole, isSyriaUser } from "@/lib/auth";

export function MobileNav() {
  const [location] = useLocation();
  const user = getStoredUser();
  const isStaff = isStaffRole(user?.role);
  const syria = isSyriaUser(user);

  const navItems = syria
    ? [
        { href: "/academy", icon: GraduationCap, label: "الأكاديمية" },
        { href: "/news", icon: Newspaper, label: "الأخبار" },
        { href: "/home", icon: UserCircle, label: "حسابي" },
        { href: "/more", icon: Menu, label: "المزيد" },
      ]
    : [
        { href: "/home", icon: UserCircle, label: "حسابي" },
        { href: "/chat", icon: MessageSquare, label: "المحادثات" },
        { href: "/news", icon: Newspaper, label: "الأخبار" },
        ...(isStaff ? [{ href: "/admin", icon: LayoutDashboard, label: "الإدارة" }] : []),
        { href: "/more", icon: Menu, label: "المزيد" },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card pb-safe z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex-1 h-full">
              <div className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
