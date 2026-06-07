import { useState } from "react";
import { Link } from "wouter";
import {
  useGetAdminTasks,
  getTasksExport,
} from "@workspace/api-client-react";
import type { GetAdminTasksParams, TaskStatus, TaskPriority } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import {
  STATUS_LABELS,
  STATUS_VARIANT,
  PRIORITY_LABELS,
  PRIORITY_CLASS,
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  formatTaskDate,
} from "@/lib/taskLabels";
import {
  AlertCircle,
  ChevronLeft,
  Plus,
  FileSpreadsheet,
  Printer,
  ClipboardList,
} from "lucide-react";

export default function AdminTasks() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [exporting, setExporting] = useState(false);

  const params: GetAdminTasksParams = {
    ...(statusFilter !== "ALL" ? { status: statusFilter as TaskStatus } : {}),
    ...(priorityFilter !== "ALL" ? { priority: priorityFilter as TaskPriority } : {}),
  };

  const { data: tasks, isLoading, isError } = useGetAdminTasks(params, {
    query: { queryKey: ["/api/admin/tasks", params], retry: false },
  });

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const downloadCsv = async () => {
    setExporting(true);
    try {
      const rows = await getTasksExport();
      const headers = [
        "المعرّف",
        "العنوان",
        "الوصف",
        "الأولوية",
        "الحالة",
        "المكلّفون",
        "تاريخ البدء",
        "الاستحقاق",
        "أنشئت بواسطة",
        "تاريخ الإنشاء",
        "آخر تقرير",
        "نسبة الإنجاز",
        "ملاحظات إدارية",
      ];
      const cell = (v: unknown) => {
        const s = v === null || v === undefined ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };
      const lines = [headers.map(cell).join(",")];
      for (const r of rows) {
        lines.push(
          [
            r.id,
            r.title,
            r.description ?? "",
            PRIORITY_LABELS[r.priority] ?? r.priority,
            STATUS_LABELS[r.status] ?? r.status,
            r.assignees ?? "",
            r.startDate ?? "",
            r.dueDate ?? "",
            r.createdByName ?? "",
            r.createdAt ?? "",
            r.latestReportText ?? "",
            typeof r.latestProgress === "number" ? `${r.latestProgress}%` : "",
            r.adminNotes ?? "",
          ]
            .map(cell)
            .join(","),
        );
      }
      const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: "destructive", title: "تعذر تصدير المهام" });
    } finally {
      setExporting(false);
    }
  };

  const printPdf = async () => {
    setExporting(true);
    try {
      const rows = await getTasksExport();
      const today = new Date().toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const body = rows
        .map(
          (r) => `<tr>
<td>${esc(String(r.id))}</td>
<td>${esc(r.title)}</td>
<td>${esc(STATUS_LABELS[r.status] ?? r.status)}</td>
<td>${esc(PRIORITY_LABELS[r.priority] ?? r.priority)}</td>
<td>${esc(r.assignees ?? "—")}</td>
<td>${esc(r.dueDate ?? "—")}</td>
<td>${esc(typeof r.latestProgress === "number" ? r.latestProgress + "%" : "—")}</td>
</tr>`,
        )
        .join("");
      const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>تقرير المهام</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 32px; color: #1a1a1a; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .date { color: #666; margin-bottom: 24px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 8px 10px; font-size: 13px; text-align: right; vertical-align: top; }
  th { background: #f4f4f5; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>تقرير المهام</h1>
<div class="date">تاريخ التقرير: ${esc(today)} — العدد: ${rows.length}</div>
<table><thead><tr>
<th>المعرّف</th><th>العنوان</th><th>الحالة</th><th>الأولوية</th><th>المكلّفون</th><th>الاستحقاق</th><th>الإنجاز</th>
</tr></thead><tbody>${body}</tbody></table>
<script>window.onload = function(){ window.print(); };</script>
</body></html>`;
      const win = window.open("", "_blank");
      if (!win) {
        toast({
          variant: "destructive",
          title: "تعذر فتح نافذة الطباعة",
          description: "يرجى السماح بالنوافذ المنبثقة ثم المحاولة مرة أخرى.",
        });
        return;
      }
      win.document.write(html);
      win.document.close();
    } catch {
      toast({ variant: "destructive", title: "تعذر تجهيز التقرير" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/admin" />
      </div>
      <div className="px-2">
        <h1 className="text-2xl font-bold">إدارة المهام</h1>
        <p className="text-muted-foreground text-sm mt-1">إنشاء المهام ومتابعتها وتصدير التقارير</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/tasks/new" className="flex-1 min-w-[140px]">
          <Button className="w-full gap-2">
            <Plus className="h-4 w-4" />
            إنشاء مهمة
          </Button>
        </Link>
        <Button variant="outline" className="gap-2" onClick={downloadCsv} disabled={exporting}>
          <FileSpreadsheet className="h-4 w-4" />
          CSV
        </Button>
        <Button variant="outline" className="gap-2" onClick={printPdf} disabled={exporting}>
          <Printer className="h-4 w-4" />
          PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الحالات</SelectItem>
            {TASK_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الأولويات</SelectItem>
            {TASK_PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <p className="text-sm">لا توجد مهام في هذا التصنيف</p>
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
                <div className="flex flex-wrap items-center gap-2">
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
                <p className="text-xs text-muted-foreground">
                  المكلّفون:{" "}
                  {t.assignees.length
                    ? t.assignees
                        .map((a) => a.userFullName ?? a.userAccount ?? `#${a.userId}`)
                        .join("، ")
                    : "—"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
