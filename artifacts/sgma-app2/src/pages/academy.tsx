import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { GraduationCap, Video, Megaphone, ChevronLeft, ShieldCheck } from "lucide-react";
import { getStoredUser, isStaffRole, isSyriaUser } from "@/lib/auth";
import { specialtyLabel } from "@/lib/academyLabels";

export default function Academy() {
  const user = getStoredUser();
  const isStaff = isStaffRole(user?.role);
  const syria = isSyriaUser(user);

  const cards = [
    {
      href: "/academy/lectures",
      icon: Video,
      title: "المحاضرات والتسجيلات",
      description: "شاهد المحاضرات المسجلة والمباشرة الخاصة باختصاصك.",
      accent: "bg-primary/10 text-primary",
    },
    {
      href: "/academy/announcements",
      icon: Megaphone,
      title: "إعلانات الأكاديمية",
      description: "المحاضرات القادمة والإعلانات الهامة.",
      accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    ...(isStaff && !syria
      ? [
          {
            href: "/admin/academy",
            icon: ShieldCheck,
            title: "إدارة الأكاديمية",
            description: "إضافة وتعديل المحاضرات والملفات.",
            accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          },
        ]
      : []),
  ];

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback={syria ? "/academy" : "/more"} />
      </div>

      <div className="px-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">أكاديمية سوريا الطبية</h1>
            <p className="text-muted-foreground text-sm mt-0.5">SGMA Academy Syria</p>
          </div>
        </div>
        {syria && user?.academySpecialty && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            اختصاصك: <span className="font-semibold text-foreground">{specialtyLabel(user.academySpecialty)}</span>
          </p>
        )}
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
