import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { History } from "lucide-react";

export default function BoardPrevious() {
  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/board" />
      </div>
      <div className="px-2">
        <h1 className="text-2xl font-bold">مجلس الإدارة السابق</h1>
      </div>
      <Card className="p-8 flex flex-col items-center text-center gap-3 shadow-sm border-border/50">
        <div className="p-4 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <History className="h-8 w-8" />
        </div>
        <p className="font-medium">مجلس الإدارة السابق قيد التحضير</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          سيتم إضافة معلومات المجالس السابقة قريباً.
        </p>
      </Card>
    </div>
  );
}
