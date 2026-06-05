import { Link } from "wouter";
import { useGetAdminStats } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/BackButton";
import {
  FileText,
  Newspaper,
  Users,
  Radio,
  ChevronLeft,
  AlertCircle,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { getStoredUser, isAdminOrSuper } from "@/lib/auth";

export default function AdminDashboard() {
  const role = getStoredUser()?.role;
  const adminOrSuper = isAdminOrSuper(role);
  const isSuper = role === "SUPER_ADMIN";

  const { data: stats, isLoading, isError } = useGetAdminStats({
    query: { queryKey: ["/api/admin/stats"], retry: false },
  });

  type StatCard = { icon: React.ComponentType<{ className?: string }>; label: string; value: number | null | undefined };

  const statCards: StatCard[] = [
    { icon: FileText, label: "مقالات بانتظار المراجعة", value: stats?.pendingArticles },
    { icon: Newspaper, label: "أخبار منشورة", value: stats?.publishedNews },
    ...(adminOrSuper
      ? [
          { icon: Users, label: "إجمالي الأعضاء", value: stats?.totalUsers },
          { icon: UserCheck, label: "أعضاء نشطون", value: stats?.activeUsers },
        ]
      : []),
    ...(isSuper
      ? [
          { icon: ShieldCheck, label: "مشرفون", value: stats?.moderatorCount },
          { icon: ShieldCheck, label: "مدراء", value: stats?.adminCount },
          { icon: ShieldCheck, label: "مدراء عامون", value: stats?.superAdminCount },
        ]
      : []),
  ];

  type LinkItem = { icon: React.ComponentType<{ className?: string }>; label: string; href: string };
  const links: LinkItem[] = [
    ...(adminOrSuper ? [{ icon: Users, label: "إدارة الأعضاء", href: "/admin/users" }] : []),
    { icon: FileText, label: "إدارة المقالات", href: "/admin/articles" },
    { icon: Newspaper, label: "إدارة الأخبار", href: "/admin/news" },
    ...(adminOrSuper ? [{ icon: Radio, label: "إدارة البث", href: "/admin/broadcasts" }] : []),
  ];

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/home" />
      </div>

      <div className="px-2">
        <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
        <p className="text-muted-foreground text-sm mt-1">نظرة عامة وإدارة المحتوى والأعضاء</p>
      </div>

      {isError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">تعذر تحميل الإحصائيات، يرجى المحاولة لاحقاً</span>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            : statCards.map((s, i) => (
                <Card key={i} className="p-4 flex flex-col gap-2 shadow-sm border-border/50">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold">{s.value ?? 0}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </Card>
              ))}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
          أقسام الإدارة
        </h3>
        <Card className="overflow-hidden shadow-sm border-border/50">
          <div className="flex flex-col divide-y divide-border/50">
            {links.map((item, i) => (
              <Link key={i} href={item.href} className="block">
                <div className="flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground opacity-50" />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
