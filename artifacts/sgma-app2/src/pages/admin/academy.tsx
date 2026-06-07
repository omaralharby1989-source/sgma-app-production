import { useRef, useState } from "react";
import {
  useGetAdminAcademyLectures,
  useCreateAdminAcademyLecture,
  useUpdateAdminAcademyLecture,
  useDeleteAdminAcademyLecture,
  getGetAdminAcademyLecturesQueryKey,
  getAdminAcademyFile,
} from "@workspace/api-client-react";
import type {
  AcademyLecture,
  CreateAcademyLectureInput,
  UpdateAcademyLectureInput,
  CreateAcademyFileInput,
  GetAdminAcademyLecturesParams,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, Plus, FileText, X, Download } from "lucide-react";
import {
  ACADEMY_SPECIALTY_LABELS,
  ACADEMY_STATUS_LABELS,
  ACADEMY_STATUS_VARIANT,
  statusLabel,
  specialtyLabel,
} from "@/lib/academyLabels";

const MAX_PDF_FILES = 5;
const MAX_PDF_BYTES = 5 * 1024 * 1024;

// GENERAL is covered by the "isGeneral" toggle, so it is not a selectable target.
const SELECTABLE_SPECIALTIES = Object.keys(ACADEMY_SPECIALTY_LABELS).filter(
  (s) => s !== "GENERAL",
);

type FormState = {
  title: string;
  description: string;
  lecturerName: string;
  lectureDate: string;
  lectureTime: string;
  isUpcoming: boolean;
  liveMeetingUrl: string;
  recordingDriveUrl: string;
  thumbnailUrl: string;
  isGeneral: boolean;
  allowedSpecialties: string[];
  status: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  lecturerName: "",
  lectureDate: "",
  lectureTime: "",
  isUpcoming: false,
  liveMeetingUrl: "",
  recordingDriveUrl: "",
  thumbnailUrl: "",
  isGeneral: true,
  allowedSpecialties: [],
  status: "DRAFT",
};

type LocalFile = { fileName: string; mimeType: string; fileData: string };

export default function AdminAcademy() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newFiles, setNewFiles] = useState<LocalFile[]>([]);
  const [existingCount, setExistingCount] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const params: GetAdminAcademyLecturesParams =
    statusFilter !== "ALL"
      ? { status: statusFilter as GetAdminAcademyLecturesParams["status"] }
      : {};

  const { data: lectures, isLoading, isError } = useGetAdminAcademyLectures(params, {
    query: { queryKey: ["/api/admin/academy/lectures", params], retry: false },
  });

  const createLecture = useCreateAdminAcademyLecture();
  const updateLecture = useUpdateAdminAcademyLecture();
  const deleteLecture = useDeleteAdminAcademyLecture();
  const saving = createLecture.isPending || updateLecture.isPending;

  function refetchList() {
    queryClient.invalidateQueries({ queryKey: getGetAdminAcademyLecturesQueryKey(params) });
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setNewFiles([]);
    setExistingCount(0);
    setDialogOpen(true);
  }

  function openEdit(l: AcademyLecture) {
    setEditingId(l.id);
    setForm({
      title: l.title,
      description: l.description,
      lecturerName: l.lecturerName,
      lectureDate: l.lectureDate ?? "",
      lectureTime: l.lectureTime ?? "",
      isUpcoming: l.isUpcoming,
      liveMeetingUrl: l.liveMeetingUrl ?? "",
      recordingDriveUrl: l.recordingDriveUrl ?? "",
      thumbnailUrl: l.thumbnailUrl ?? "",
      isGeneral: l.isGeneral,
      allowedSpecialties: l.allowedSpecialties ?? [],
      status: l.status,
    });
    setNewFiles([]);
    setExistingCount(0);
    setDialogOpen(true);
  }

  function toggleSpecialty(s: string) {
    setForm((f) => ({
      ...f,
      allowedSpecialties: f.allowedSpecialties.includes(s)
        ? f.allowedSpecialties.filter((x) => x !== s)
        : [...f.allowedSpecialties, s],
    }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const picked = Array.from(files);
    if (newFiles.length + picked.length > MAX_PDF_FILES) {
      toast({ title: `الحد الأقصى ${MAX_PDF_FILES} ملفات`, variant: "destructive" });
      return;
    }
    const next: LocalFile[] = [];
    for (const file of picked) {
      if (file.type !== "application/pdf") {
        toast({ title: "يُسمح بملفات PDF فقط", variant: "destructive" });
        continue;
      }
      if (file.size > MAX_PDF_BYTES) {
        toast({ title: `حجم الملف يتجاوز 5 ميجابايت: ${file.name}`, variant: "destructive" });
        continue;
      }
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }).catch(() => null);
      if (dataUri) {
        next.push({ fileName: file.name, mimeType: "application/pdf", fileData: dataUri });
      }
    }
    setNewFiles((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function downloadFile(fileId: number) {
    try {
      const file = await getAdminAcademyFile(fileId);
      const a = document.createElement("a");
      a.href = file.fileData;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast({ variant: "destructive", title: "تعذر تحميل الملف" });
    }
  }

  function handleSave() {
    if (!form.title.trim() || !form.description.trim() || !form.lecturerName.trim()) {
      toast({ title: "العنوان والوصف واسم المحاضِر مطلوبة", variant: "destructive" });
      return;
    }
    if (!form.isGeneral && form.allowedSpecialties.length === 0) {
      toast({ title: "اختر اختصاصاً واحداً على الأقل أو فعّل (عام)", variant: "destructive" });
      return;
    }

    const attachments: CreateAcademyFileInput[] = newFiles.map((f) => ({
      fileName: f.fileName,
      mimeType: f.mimeType,
      fileData: f.fileData,
    }));

    const onError = (err: unknown) => {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر حفظ المحاضرة";
      toast({ title: msg, variant: "destructive" });
    };

    const base = {
      title: form.title.trim(),
      description: form.description.trim(),
      lecturerName: form.lecturerName.trim(),
      lectureDate: form.lectureDate.trim() || null,
      lectureTime: form.lectureTime.trim() || null,
      isUpcoming: form.isUpcoming,
      liveMeetingUrl: form.liveMeetingUrl.trim() || null,
      recordingDriveUrl: form.recordingDriveUrl.trim() || null,
      thumbnailUrl: form.thumbnailUrl.trim() || null,
      isGeneral: form.isGeneral,
      allowedSpecialties: form.isGeneral ? [] : form.allowedSpecialties,
      status: form.status as CreateAcademyLectureInput["status"],
    };

    if (editingId) {
      const payload: UpdateAcademyLectureInput = {
        ...base,
        ...(attachments.length > 0 ? { attachments } : {}),
      };
      updateLecture.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast({ title: "تم تحديث المحاضرة" });
            refetchList();
            setDialogOpen(false);
          },
          onError,
        },
      );
    } else {
      const payload: CreateAcademyLectureInput = {
        ...base,
        ...(attachments.length > 0 ? { attachments } : {}),
      };
      createLecture.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "تم إنشاء المحاضرة" });
            refetchList();
            setDialogOpen(false);
          },
          onError,
        },
      );
    }
  }

  function handleDelete() {
    if (deleteId == null) return;
    deleteLecture.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "تم أرشفة المحاضرة" });
          refetchList();
          setDeleteId(null);
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر حذف المحاضرة";
          toast({ title: msg, variant: "destructive" });
          setDeleteId(null);
        },
      },
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/academy" />
      </div>
      <div className="px-2 flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">إدارة الأكاديمية</h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وتحرير محاضرات أكاديمية سوريا</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          محاضرة
        </Button>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">كل الحالات</SelectItem>
          {Object.entries(ACADEMY_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">تعذر تحميل المحاضرات، يرجى المحاولة لاحقاً</span>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !lectures || lectures.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">لا توجد محاضرات في هذه الحالة</Card>
      ) : (
        <div className="space-y-2">
          {lectures.map((l) => (
            <Card key={l.id} className="p-4 shadow-sm border-border/50 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{l.title}</div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{l.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{l.lecturerName}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={ACADEMY_STATUS_VARIANT[l.status] ?? "secondary"}>
                    {statusLabel(l.status)}
                  </Badge>
                  {l.isUpcoming && <Badge variant="secondary" className="text-[10px]">قادمة</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {l.isGeneral ? (
                  <Badge variant="outline" className="text-[10px]">{specialtyLabel("GENERAL")}</Badge>
                ) : (
                  l.allowedSpecialties.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">{specialtyLabel(s)}</Badge>
                  ))
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(l)}>
                  تحرير
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(l.id)}>
                  أرشفة
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تحرير المحاضرة" : "محاضرة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>العنوان *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف *</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label>اسم المحاضِر *</Label>
              <Input value={form.lecturerName} onChange={(e) => setForm((f) => ({ ...f, lecturerName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>التاريخ</Label>
                <Input type="date" value={form.lectureDate} onChange={(e) => setForm((f) => ({ ...f, lectureDate: e.target.value }))} className="text-left" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>الوقت</Label>
                <Input type="time" value={form.lectureTime} onChange={(e) => setForm((f) => ({ ...f, lectureTime: e.target.value }))} className="text-left" dir="ltr" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="cursor-pointer">محاضرة قادمة</Label>
                <p className="text-xs text-muted-foreground mt-0.5">تظهر في الإعلانات</p>
              </div>
              <Switch checked={form.isUpcoming} onCheckedChange={(v) => setForm((f) => ({ ...f, isUpcoming: v }))} />
            </div>

            <div className="space-y-1.5">
              <Label>رابط البث المباشر</Label>
              <Input value={form.liveMeetingUrl} onChange={(e) => setForm((f) => ({ ...f, liveMeetingUrl: e.target.value }))} className="text-left" dir="ltr" placeholder="https://..." />
            </div>

            <div className="space-y-1.5">
              <Label>رابط التسجيل (Google Drive)</Label>
              <Input value={form.recordingDriveUrl} onChange={(e) => setForm((f) => ({ ...f, recordingDriveUrl: e.target.value }))} className="text-left" dir="ltr" placeholder="https://drive.google.com/file/d/.../view" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                تأكد أن ملف Google Drive قابل للعرض لمن يملك الرابط.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="cursor-pointer">عام (لجميع الاختصاصات)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">متاحة لكل أعضاء الأكاديمية</p>
              </div>
              <Switch checked={form.isGeneral} onCheckedChange={(v) => setForm((f) => ({ ...f, isGeneral: v }))} />
            </div>

            {!form.isGeneral && (
              <div className="space-y-2">
                <Label>الاختصاصات المسموح لها</Label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3">
                  {SELECTABLE_SPECIALTIES.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.allowedSpecialties.includes(s)}
                        onCheckedChange={() => toggleSpecialty(s)}
                      />
                      <span>{ACADEMY_SPECIALTY_LABELS[s]}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACADEMY_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ملفات PDF مرفقة</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <FileText className="h-4 w-4 ml-1" />
                إضافة ملف PDF
              </Button>
              <p className="text-xs text-muted-foreground">
                حتى {MAX_PDF_FILES} ملفات، كل ملف ≤ 5 ميجابايت.
              </p>
              {newFiles.length > 0 && (
                <div className="space-y-1.5">
                  {newFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span className="truncate">{f.fileName}</span>
                      <button
                        type="button"
                        onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {editingId && (
                <p className="text-xs text-muted-foreground">
                  الملفات الجديدة تُضاف إلى الملفات الحالية للمحاضرة.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>أرشفة المحاضرة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم أرشفة هذه المحاضرة ولن تظهر للأعضاء. يمكنك استعادتها لاحقاً بتغيير حالتها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLecture.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              أرشفة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
