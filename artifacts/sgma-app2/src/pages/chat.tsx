import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Globe, Headset, ChevronLeft } from "lucide-react";
import { getStoredUser, isStaffRole } from "@/lib/auth";

export default function Chat() {
  const user = getStoredUser();
  const staff = isStaffRole(user?.role);

  const cards = [
    {
      href: "/chat/public",
      icon: Globe,
      title: "محادثة الأعضاء العامة",
      description: "تواصل مع جميع أعضاء المجتمع في غرفة المحادثة العامة.",
      accent: "bg-primary/10 text-primary",
    },
    {
      href: "/chat/admin",
      icon: Headset,
      title: staff ? "محادثات الأعضاء مع الإدارة" : "التواصل مع فريق الإدارة",
      description: staff
        ? "اطّلع على رسائل الأعضاء وردّ عليهم مباشرة."
        : "أرسل رسالة خاصة إلى فريق الإدارة واحصل على المساعدة.",
      accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-4 pb-2 px-2">
        <h1 className="text-2xl font-bold">المحادثات</h1>
        <p className="text-muted-foreground text-sm mt-1">اختر نوع المحادثة للبدء</p>
      </div>

      <div className="space-y-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="block">
            <Card className="p-4 shadow-sm border-border/50 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${c.accent}`}>
                  <c.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{c.description}</p>
                </div>
                <ChevronLeft className="h-5 w-5 text-muted-foreground opacity-50 shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
