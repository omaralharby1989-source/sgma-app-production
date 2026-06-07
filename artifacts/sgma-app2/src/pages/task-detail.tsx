import { useState, useRef } from "react";
import { useRoute } from "wouter";
import {
  useGetTask,
  useCreateTaskReport,
  useUpdateAdminTask,
  getGetTaskQueryKey,
  getGetMyTasksQueryKey,
  getGetAdminTasksQueryKey,
  getTaskReportAttachment,
} from "@workspace/api-client-react";
import type { TaskStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { getStoredUser, isStaffRole } from "@/lib/auth";
import {
  STATUS_LABELS,
  STATUS_VARIANT,
  PRIORITY_LABELS,
  PRIORITY_CLASS,
  TASK_STATUS_OPTIONS,
  formatTaskDate,
} from "@/lib/taskLabels";
import {
  AlertCircle,
  Loader2,
  Send,
  Paperclip,
  FileText,
  Trash2,
  Download,
  ClipboardList,
  Users,
  StickyNote,
} from "lucide-react";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

type LocalFile = { fileName: string; mimeType: string; fileData: string };

const readAsDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskDetail() {
  const [, params] = useRoute("/tasks/:id");
  const id = Number(params?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const staff = isStaffRole(getStoredUser()?.role);

  const [reportText, setReportText] = useState("");
  const [progress, setProgress] = useState("");
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [statusValue, setStatusValue] = useState<string>("");

  const {
    data: task,
    isLoading,
    isError,
  } = useGetTask(id, {
    query: { queryKey: getGetTaskQueryKey(id), enabled: Number.isInteger(id), retry: false },
  });

  const createReport = useCreateTaskReport();
  const updateTask = useUpdateAdminTask();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetTaskQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminTasksQueryKey() });
  };

  const handleFiles = async (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const incoming = Array.from(selected);
    if (files.length + incoming.length > MAX_FILES) {
      toast({
        variant: "destructive",
        title: "عدد الملفات كبير",
        description: `يمكنك رفع ${MAX_FILES} ملفات كحد أقصى.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const next: LocalFile[] = [];
    for (const file of incoming) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "نوع ملف غير مدعوم",
          description: `الملف "${file.name}" يجب أن يكون PDF أو صورة (JPG/PNG/WEBP).`,
        });
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast({
          variant: "destructive",
          title: "حجم الملف كبير",
          description: `الملف "${file.name}" يتجاوز 5MB.`,
        });
        continue;
      }
      try {
        const dataUri = await readAsDataUri(file);
        next.push({ fileName: file.name, mimeType: file.type, fileData: dataUri });
      } catch {
        toast({
          variant: "destructive",
          title: "تعذر قراءة الملف",
          description: `الملف "${file.name}" تعذّرت قراءته.`,
        });
      }
    }
    if (next.length) setFiles((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submitReport = () => {
    const text = reportText.trim();
    if (!text) {
      toast({ variant: "destructive", title: "نص مطلوب", description: "يرجى إدخال نص التقرير." });
      return;
    }
    let progressPercent: number | undefined;
    if (!staff && progress.trim()) {
      const p = Number(progress);
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        toast({
          variant: "destructive",
          title: "نسبة غير صالحة",
          description: "نسبة الإنجاز يجب أن تكون بين 0 و 100.",
        });
        return;
      }
      progressPercent = Math.round(p);
    }
    createReport.mutate(
      {
        id,
        data: {
          reportText: text,
          ...(staff ? { reportType: "ADMIN_NOTE" as const } : {}),
          ...(progressPercent !== undefined ? { progressPercent } : {}),
          ...(files.length ? { attachments: files } : {}),
        },
      },
      {
        onSuccess: () => {
          toast({
            title: staff ? "تمت إضافة الملاحظة" : "تم إرسال التقرير",
          });
          setReportText("");
          setProgress("");
          setFiles([]);
          invalidate();
        },
        onError: (err) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر إرسال التقرير";
          toast({ variant: "destructive", title: msg });
        },
      },
    );
  };

  const submitStatus = () => {
    if (!statusValue) return;
    updateTask.mutate(
      { id, data: { status: statusValue as TaskStatus } },
      {
        onSuccess: () => {
          toast({ title: "تم تحديث حالة المهمة" });
          setStatusValue("");
          invalidate();
        },
        onError: (err) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر تحديث الحالة";
          toast({ variant: "destructive", title: msg });
        },
      },
    );
  };

  const downloadAttachment = async (attachmentId: number) => {
    try {
      const file = await getTaskReportAttachment(attachmentId);
      const a = document.createElement("a");
      a.href = file.fileData;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast({ variant: "destructive", title: "تعذر تحميل الملف" });
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback={staff ? "/admin/tasks" : "/tasks"} />
      </div>

      {isError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">المهمة غير موجودة أو ليس لديك صلاحية لعرضها</span>
        </Card>
      ) : isLoading || !task ? (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <>
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-lg flex items-center gap-2 min-w-0">
                  <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                  <span className="min-w-0">{task.title}</span>
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant={STATUS_VARIANT[task.status] ?? "secondary"}>
                  {STATUS_LABELS[task.status] ?? task.status}
                </Badge>
                <Badge variant="outline" className={PRIORITY_CLASS[task.priority] ?? ""}>
                  {PRIORITY_LABELS[task.priority] ?? task.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <p className="whitespace-pre-line">{task.description}</p>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <span>تاريخ البدء: {formatTaskDate(task.startDate)}</span>
                <span>الاستحقاق: {formatTaskDate(task.dueDate)}</span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <Users className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  المكلّفون:{" "}
                  {task.assignees.length
                    ? task.assignees
                        .map((a) => a.userFullName ?? a.userAccount ?? `#${a.userId}`)
                        .join("، ")
                    : "—"}
                </span>
              </div>
              {staff && task.adminNotes && (
                <p className="rounded-md bg-muted/50 p-2">
                  <span className="font-medium">ملاحظات إدارية: </span>
                  {task.adminNotes}
                </p>
              )}
            </CardContent>
          </Card>

          {staff && (
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">تغيير حالة المهمة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={statusValue} onValueChange={setStatusValue}>
                  <SelectTrigger>
                    <SelectValue placeholder={STATUS_LABELS[task.status] ?? "اختر الحالة"} />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  onClick={submitStatus}
                  disabled={!statusValue || statusValue === task.status || updateTask.isPending}
                >
                  {updateTask.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  حفظ الحالة
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-primary" />
                {staff ? "التقارير والملاحظات" : "التقارير"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {task.reports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  لا توجد تقارير بعد
                </p>
              ) : (
                <ul className="space-y-3">
                  {task.reports.map((r) => (
                    <li key={r.id} className="rounded-lg border bg-background p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {r.authorName ?? "—"}
                          <Badge
                            variant={r.reportType === "ADMIN_NOTE" ? "outline" : "secondary"}
                            className="mr-2"
                          >
                            {r.reportType === "ADMIN_NOTE" ? "ملاحظة إدارية" : "تقرير عضو"}
                          </Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTaskDate(r.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-line">{r.reportText}</p>
                      {typeof r.progressPercent === "number" && (
                        <p className="text-xs text-muted-foreground">
                          نسبة الإنجاز: {r.progressPercent}%
                        </p>
                      )}
                      {r.attachments.length > 0 && (
                        <div className="space-y-1 pt-1 border-t">
                          {r.attachments.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => downloadAttachment(a.id)}
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {a.fileName}
                              <span className="text-muted-foreground">
                                ({formatBytes(a.fileSize)})
                              </span>
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-3 pt-2 border-t">
                <Label htmlFor="task-report">
                  {staff ? "إضافة ملاحظة إدارية" : "إضافة تقرير"}
                </Label>
                <Textarea
                  id="task-report"
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder={staff ? "اكتب ملاحظتك..." : "اكتب تقريرك عن سير المهمة..."}
                  rows={4}
                  maxLength={4000}
                />
                {!staff && (
                  <div className="space-y-1.5">
                    <Label htmlFor="task-progress">نسبة الإنجاز (%) — اختياري</Label>
                    <Input
                      id="task-progress"
                      type="number"
                      min={0}
                      max={100}
                      value={progress}
                      onChange={(e) => setProgress(e.target.value)}
                      placeholder="مثال: 50"
                    />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={files.length >= MAX_FILES}
                >
                  <Paperclip className="h-4 w-4" />
                  إضافة مرفق (PDF أو صورة)
                </Button>
                {files.length > 0 && (
                  <ul className="space-y-2">
                    {files.map((f, i) => (
                      <li
                        key={`${f.fileName}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-md border bg-background p-2"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate text-sm">{f.fileName}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive shrink-0"
                          onClick={() => removeFile(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={submitReport}
                  disabled={createReport.isPending}
                >
                  {createReport.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {staff ? "إضافة الملاحظة" : "إرسال التقرير"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
