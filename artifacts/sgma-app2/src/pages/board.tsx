import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { Users, History, Archive, ChevronLeft } from "lucide-react";

const cards = [
  {
    href: "/board/current",
    icon: Users,
    title: "مجلس الإدارة الحالي",
    description: "أعضاء مجلس الإدارة الحالي للجمعية.",
    button: "عرض المجلس الحالي",
    accent: "bg-primary/10 text-primary",
    enabled: true,
  },
  {
    href: "/board/previous",
    icon: History,
    title: "مجلس الإدارة السابق",
    description: "استعراض المجالس السابقة للجمعية.",
    button: "قيد التحضير",
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    enabled: false,
  },
  {
    href: "/board/history",
    icon: Archive,
    title: "أرشيف المجالس",
    description: "توثيق تاريخي لدورات مجلس الإدارة.",
    button: "قيد التحضير",
    accent: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    enabled: false,
  },
];

export default function Board() {
  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/more" />
      </div>

      <div className="px-2">
        <h1 className="text-2xl font-bold">مجلس الإدارة</h1>
        <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
          تعرف على مجلس إدارة الجمعية الطبية السورية الألمانية SGMA
        </p>
      </div>

      <div className="space-y-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="block">
            <Card className="p-4 shadow-sm border-border/50 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${c.accent}`}>
                  <c.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    {c.description}
                  </p>
                  <span
                    className={`inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full ${
                      c.enabled
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {c.button}
                  </span>
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
