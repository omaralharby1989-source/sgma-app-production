import { Link, useLocation } from "wouter";
import { useGetMemberProfile, useGetMyTasks } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, LogOut, MessageSquare, Newspaper, FileText, Radio, ChevronLeft, LayoutDashboard, Users, Building2, ShieldCheck, ScrollText, Landmark, HandHeart, Megaphone, ClipboardList, GraduationCap } from "lucide-react";
import { getStoredUser, isStaffRole, isAdminOrSuper, isSuperAdminRole, isSyriaUser } from "@/lib/auth";

export default function More() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = useGetMemberProfile();
  const user = getStoredUser();
  const role = user?.role;
  const isStaff = isStaffRole(role);
  const adminOrSuper = isAdminOrSuper(role);
  const superAdmin = isSuperAdminRole(role);
  const syria = isSyriaUser(user);
  const { data: myTasks } = useGetMyTasks({
    query: { queryKey: ["/api/tasks/my"], retry: false, enabled: !syria && !isStaff },
  });
  const hasTasks = !!myTasks && myTasks.length > 0;

  const handleLogout = () => {
    localStorage.removeItem("sgma_auth_token");
    localStorage.removeItem("sgma_auth_user");
    setLocation("/login");
  };

  type MenuItem = {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    comingSoon?: boolean;
    href?: string;
    onClick?: () => void;
    destructive?: boolean;
  };

  const syriaMenuGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: "أكاديمية سوريا",
      items: [
        { icon: GraduationCap, label: "الأكاديمية", href: "/academy" },
        { icon: Newspaper, label: "الأخبار", href: "/news" },
        { icon: FileText, label: "المقالات", href: "/articles" },
      ],
    },
    {
      title: "الجمعية والمعلومات",
      items: [
        { icon: Building2, label: "من نحن", href: "/about-sgma" },
        { icon: ShieldCheck, label: "سياسة الخصوصية", href: "/privacy-policy" },
        { icon: ScrollText, label: "الشروط والأحكام", href: "/terms" },
        { icon: Info, label: "معلومات المطور", href: "/developer-info" },
      ],
    },
    {
      title: "الحساب",
      items: [
        { icon: LogOut, label: "تسجيل الخروج", onClick: handleLogout, destructive: true },
      ],
    },
  ];

  const fullMenuGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: "التطبيقات والخدمات",
      items: [
        { icon: GraduationCap, label: "أكاديمية سوريا", href: "/academy" },
        { icon: MessageSquare, label: "المحادثات", href: "/chat" },
        { icon: Newspaper, label: "الأخبار", href: "/news" },
        { icon: FileText, label: "المقالات", href: "/articles" },
        { icon: HandHeart, label: "تسجيل للوفود التطوعية", href: "/volunteer-delegations" },
        ...(!isStaff && hasTasks
          ? ([{ icon: ClipboardList, label: "مهامي", href: "/tasks" }] as MenuItem[])
          : []),
      ],
    },
    {
      title: "الجمعية والمعلومات",
      items: [
        { icon: Building2, label: "من نحن", href: "/about-sgma" },
        { icon: Landmark, label: "مجلس الإدارة", href: "/board" },
        { icon: ShieldCheck, label: "سياسة الخصوصية", href: "/privacy-policy" },
        { icon: ScrollText, label: "الشروط والأحكام", href: "/terms" },
        { icon: Info, label: "معلومات المطور", href: "/developer-info" },
      ],
    },
    ...(isStaff
      ? [
          {
            title: "لوحة التحكم",
            items: [
              { icon: LayoutDashboard, label: "لوحة الإدارة", href: "/admin" },
              ...(adminOrSuper
                ? ([{ icon: Users, label: "إدارة الأعضاء", href: "/admin/users" }] as MenuItem[])
                : []),
              { icon: FileText, label: "إدارة المقالات", href: "/admin/articles" },
              { icon: Newspaper, label: "إدارة الأخبار", href: "/admin/news" },
              { icon: ClipboardList, label: "إدارة المهام", href: "/admin/tasks" },
              { icon: HandHeart, label: "طلبات الوفود التطوعية", href: "/admin/volunteer-delegations" },
              ...(adminOrSuper
                ? ([{ icon: Radio, label: "إدارة البث", href: "/admin/broadcasts" }] as MenuItem[])
                : []),
              ...(superAdmin
                ? ([{ icon: Megaphone, label: "إدارة الإعلانات", href: "/admin/ads" }] as MenuItem[])
                : []),
            ] as MenuItem[],
          },
        ]
      : []),
    {
      title: "الحساب",
      items: [
        { icon: LogOut, label: "تسجيل الخروج", onClick: handleLogout, destructive: true },
      ],
    },
  ];

  const menuGroups = syria ? syriaMenuGroups : fullMenuGroups;

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">

      <div className="pt-4 pb-2 px-2">
        <h1 className="text-2xl font-bold">المزيد</h1>
        {isLoading ? (
          <Skeleton className="h-4 w-32 mt-2" />
        ) : (
          <p className="text-muted-foreground text-sm mt-1">مرحباً، {profile?.fullName}</p>
        )}
      </div>

      <div className="space-y-6">
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
              {group.title}
            </h3>
            <Card className="overflow-hidden shadow-sm border-border/50">
              <div className="flex flex-col divide-y divide-border/50">
                {group.items.map((item, i) => {
                  const content = (
                    <div className="flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${item.destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                          <item.icon className="h-5 w-5" />
                        </div>
                        <span className={`font-medium ${item.destructive ? 'text-destructive' : ''}`}>
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {item.comingSoon && (
                          <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full ml-2 font-medium">
                            قريباً
                          </span>
                        )}
                        {!item.comingSoon && !item.destructive && (
                          <ChevronLeft className="h-5 w-5 text-muted-foreground opacity-50" />
                        )}
                      </div>
                    </div>
                  );

                  if (item.href) {
                    return (
                      <Link key={i} href={item.href} className="block">
                        {content}
                      </Link>
                    );
                  }

                  if (item.onClick) {
                    return (
                      <button key={i} onClick={item.onClick} className="w-full text-right text-inherit">
                        {content}
                      </button>
                    );
                  }

                  return <div key={i} className={item.comingSoon ? "opacity-70 cursor-not-allowed" : ""}>{content}</div>;
                })}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
