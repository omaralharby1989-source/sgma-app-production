import { Link } from "wouter";
import { useGetMyTasks } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/BackButton";
import { ClipboardList, AlertCircle, ChevronLeft } from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_VARIANT,
  PRIORITY_LABELS,
  PRIORITY_CLASS,
  formatTaskDate,
} from "@/lib/taskLabels";

export default function Tasks() {
  const { data: tasks, isLoading, isError } = useGetMyTasks({
    query: { queryKey: ["/api/tasks/my"], retry: false },
  });

  return (
    <div className="p-4 pb-24 space-y-4 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/more" />
      </div>
      <div className="px-2">
        <h1 className="text-2xl font-bold">مهامي</h1>
        <p className="text-muted-foreground text-sm mt-1">المهام المكلّف بها ومتابعة تقاريرها</p>
      </div>

      {isError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">تعذر تحميل المهام، يرجى المحاولة لاحقاً</span>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">لا توجد مهام مكلّف بها حالياً</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Link key={t.id} href={`/tasks/${t.id}`} className="block">
              <Card className="p-4 shadow-sm border-border/50 hover:bg-muted/40 transition-colors space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold leading-snug min-w-0">{t.title}</h3>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground opacity-50 shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant={STATUS_VARIANT[t.status] ?? "secondary"}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </Badge>
                  <Badge variant="outline" className={PRIORITY_CLASS[t.priority] ?? ""}>
                    {PRIORITY_LABELS[t.priority] ?? t.priority}
                  </Badge>
                  {t.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      الاستحقاق: {formatTaskDate(t.dueDate)}
                    </span>
                  )}
                </div>
                {typeof t.latestProgress === "number" && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>نسبة الإنجاز</span>
                      <span>{t.latestProgress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.max(0, Math.min(100, t.latestProgress))}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
