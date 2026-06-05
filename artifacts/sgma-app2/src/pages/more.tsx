import { Link, useLocation } from "wouter";
import { useGetMemberProfile } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, LogOut, MessageSquare, Newspaper, FileText, Radio, ChevronLeft } from "lucide-react";
import { getStoredUser, isStaffRole } from "@/lib/auth";

export default function More() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading } = useGetMemberProfile();
  const isStaff = isStaffRole(getStoredUser()?.role);

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

  const menuGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: "التطبيقات والخدمات",
      items: [
        { icon: MessageSquare, label: "المحادثات", href: "/chat" },
        { icon: Newspaper, label: "الأخبار", href: "/news" },
        { icon: FileText, label: "المقالات", href: "/articles" },
        { icon: Info, label: "معلومات المطور", href: "/developer-info" },
      ],
    },
    ...(isStaff
      ? [
          {
            title: "الإدارة والإشراف",
            items: [{ icon: Radio, label: "إرسال بث", href: "/broadcast" }] as MenuItem[],
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
