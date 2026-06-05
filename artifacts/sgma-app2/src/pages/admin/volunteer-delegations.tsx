import { useState } from "react";
import {
  useGetAdminVolunteerDelegations,
  useUpdateAdminVolunteerDelegation,
  getGetAdminVolunteerDelegationsQueryKey,
  getAdminVolunteerDelegationFile,
} from "@workspace/api-client-react";
import type {
  AdminVolunteerDelegationRequest,
  VolunteerDelegationStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, Download, FileText, Phone, Mail } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "تم الإرسال",
  IN_REVIEW: "قيد المراجعة",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  ARCHIVED: "مؤرشف",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  SUBMITTED: "secondary",
  IN_REVIEW: "outline",
  ACCEPTED: "default",
  REJECTED: "destructive",
  ARCHIVED: "outline",
};

const STATUS_OPTIONS = ["SUBMITTED", "IN_REVIEW", "ACCEPTED", "REJECTED", "ARCHIVED"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminVolunteerDelegations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [editing, setEditing] = useState<AdminVolunteerDelegationRequest | null>(null);
  const [editStatus, setEditStatus] = useState<string>("SUBMITTED");
  const [editNotes, setEditNotes] = useState("");

  const params =
    statusFilter !== "ALL" ? { status: statusFilter as VolunteerDelegationStatus } : {};

  const { data: requests, isLoading, isError } = useGetAdminVolunteerDelegations(params, {
    query: { queryKey: ["/api/admin/volunteer-delegations", params], retry: false },
  });

  const update = useUpdateAdminVolunteerDelegation();

  function refetchList() {
    queryClient.invalidateQueries({
      queryKey: getGetAdminVolunteerDelegationsQueryKey(params),
    });
  }

  function openEdit(r: AdminVolunteerDelegationRequest) {
    setEditing(r);
    setEditStatus(r.status);
    setEditNotes(r.adminNotes ?? "");
  }

  function handleUpdate() {
    if (!editing) return;
    update.mutate(
      {
        id: editing.id,
        data: {
          status: editStatus as VolunteerDelegationStatus,
          adminNotes: editNotes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "تم تحديث حالة الطلب" });
          refetchList();
          setEditing(null);
        },
        onError: (err) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر تحديث الطلب";
          toast({ title: msg, variant: "destructive" });
        },
      },
    );
  }

  async function downloadFile(fileId: number) {
    try {
      const file = await getAdminVolunteerDelegationFile(fileId);
      const a = document.createElement("a");
      a.href = file.fileData;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast({ title: "تعذر تحميل الملف", variant: "destructive" });
    }
  }

  return (
    <div className="p-4 pb-24 space-y-4 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/admin" />
      </div>
      <div className="px-2">
        <h1 className="text-2xl font-bold">طلبات الوفود التطوعية</h1>
        <p className="text-muted-foreground text-sm mt-1">
          مراجعة طلبات العمل التطوعي وتحديث حالتها
        </p>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">كل الحالات</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">تعذر تحميل الطلبات، يرجى المحاولة لاحقاً</span>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !requests || requests.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          لا توجد طلبات في هذه الحالة
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="p-4 shadow-sm border-border/50 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{r.fullNameArabic}</div>
                  <div className="text-sm text-muted-foreground" dir="ltr">
                    {r.fullNameGerman}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </Badge>
              </div>

              <div className="text-sm space-y-1 text-muted-foreground">
                <div className="flex items-center gap-2" dir="ltr">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{r.phone}</span>
                  <span className="text-xs">(واتساب: {r.whatsapp})</span>
                </div>
                <div className="flex items-center gap-2" dir="ltr">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{r.email}</span>
                </div>
                <p>المجموعة المهنية: {r.professionGroup}</p>
                <p>التخصص: {r.specialtyWithCertificate}</p>
                <p>نوع العمل التطوعي: {r.volunteerWorkType}</p>
                <p>تاريخ العمل التطوعي: {r.volunteerWorkDateText}</p>
                <p>
                  تاريخ النزول: {r.travelToSyriaFrom} ← {r.travelToSyriaTo}
                </p>
                <p>
                  مساعدة ترخيص المهنة: {r.needsSyrianPracticeLicenseHelp ? "نعم" : "لا"}
                </p>
                <p>
                  معدات لوجستية: {r.hasLogisticsEquipment ? "نعم" : "لا"}
                  {r.hasLogisticsEquipment && r.equipmentDetails
                    ? ` — ${r.equipmentDetails}`
                    : ""}
                </p>
              </div>

              {r.attachments.length > 0 && (
                <div className="space-y-1 pt-1 border-t">
                  <p className="text-xs font-medium pt-1">المرفقات:</p>
                  {r.attachments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => downloadFile(a.id)}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {a.fileName}
                      <span className="text-muted-foreground">({formatBytes(a.fileSize)})</span>
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              )}

              {r.adminNotes && (
                <p className="text-sm rounded-md bg-muted/50 p-2">
                  <span className="font-medium">ملاحظات الإدارة: </span>
                  {r.adminNotes}
                </p>
              )}

              <div className="pt-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                  تحديث الحالة
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تحديث حالة الطلب</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>الحالة</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات الإدارة (اختياري)</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="ملاحظات تظهر لمقدّم الطلب"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={update.isPending}>
              إلغاء
            </Button>
            <Button onClick={handleUpdate} disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
