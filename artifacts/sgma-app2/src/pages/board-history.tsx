import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { Archive } from "lucide-react";

export default function BoardHistory() {
  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/board" />
      </div>
      <div className="px-2">
        <h1 className="text-2xl font-bold">أرشيف المجالس</h1>
      </div>
      <Card className="p-8 flex flex-col items-center text-center gap-3 shadow-sm border-border/50">
        <div className="p-4 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400">
          <Archive className="h-8 w-8" />
        </div>
        <p className="font-medium">أرشيف مجالس الإدارة قيد التحضير</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          سيتم توثيق دورات مجلس الإدارة السابقة هنا قريباً.
        </p>
      </Card>
    </div>
  );
}
