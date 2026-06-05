import { useState } from "react";
import {
  useGetAdminBroadcasts,
  useCreateAdminBroadcast,
  useUpdateAdminBroadcast,
  useDeleteAdminBroadcast,
  getGetAdminBroadcastsQueryKey,
} from "@workspace/api-client-react";
import type { BroadcastItem, CreateBroadcastInput, UpdateBroadcastInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { AlertCircle, Loader2, Plus } from "lucide-react";

type FormState = { title: string; content: string; expiresAt: string };
const EMPTY_FORM: FormState = { title: "", content: "", expiresAt: "" };

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ar", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function AdminBroadcasts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<BroadcastItem | null>(null);

  const { data: broadcasts, isLoading, isError } = useGetAdminBroadcasts({
    query: { queryKey: ["/api/admin/broadcasts"], retry: false },
  });

  const createB = useCreateAdminBroadcast();
  const updateB = useUpdateAdminBroadcast();
  const deleteB = useDeleteAdminBroadcast();
  const saving = createB.isPending || updateB.isPending;

  function refetchList() {
    queryClient.invalidateQueries({ queryKey: getGetAdminBroadcastsQueryKey() });
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(b: BroadcastItem) {
    setEditingId(b.id);
    setForm({
      title: b.title,
      content: b.content,
      expiresAt: b.expiresAt ? b.expiresAt.slice(0, 10) : "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "العنوان والنص مطلوبان", variant: "destructive" });
      return;
    }

    const onError = (err: unknown) => {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر حفظ البث";
      toast({ title: msg, variant: "destructive" });
    };

    if (editingId) {
      const payload: UpdateBroadcastInput = {
        title: form.title.trim(),
        content: form.content.trim(),
        expiresAt: form.expiresAt ? form.expiresAt : null,
      };
      updateB.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast({ title: "تم تحديث البث" });
            refetchList();
            setDialogOpen(false);
          },
          onError,
        },
      );
    } else {
      const payload: CreateBroadcastInput = {
        title: form.title.trim(),
        content: form.content.trim(),
        ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
      };
      createB.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "تم إرسال البث" });
            refetchList();
            setDialogOpen(false);
          },
          onError,
        },
      );
    }
  }

  function toggleActive(b: BroadcastItem) {
    updateB.mutate(
      { id: b.id, data: { isActive: !b.isActive } },
      {
        onSuccess: () => {
          toast({ title: b.isActive ? "تم إيقاف البث" : "تم تفعيل البث" });
          refetchList();
        },
        onError: (err) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر تعديل البث";
          toast({ title: msg, variant: "destructive" });
        },
      },
    );
  }

  function handleDelete() {
    if (!deleting) return;
    deleteB.mutate(
      { id: deleting.id },
      {
        onSuccess: () => {
          toast({ title: "تم حذف البث" });
          refetchList();
          setDeleting(null);
        },
        onError: (err) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر حذف البث";
          toast({ title: msg, variant: "destructive" });
        },
      },
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/admin" />
      </div>
      <div className="px-2 flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">إدارة البث</h1>
          <p className="text-muted-foreground text-sm mt-1">إرسال وإدارة رسائل البث للأعضاء</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          بث جديد
        </Button>
      </div>

      {isError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">تعذر تحميل رسائل البث، يرجى المحاولة لاحقاً</span>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : !broadcasts || broadcasts.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">لا توجد رسائل بث</Card>
      ) : (
        <div className="space-y-2">
          {broadcasts.map((b) => (
            <Card key={b.id} className="p-4 shadow-sm border-border/50 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{b.title}</div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{b.content}</p>
                  {b.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ينتهي: {formatDate(b.expiresAt)}
                    </p>
                  )}
                </div>
                <Badge variant={b.isActive ? "default" : "outline"}>
                  {b.isActive ? "نشط" : "متوقف"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={b.isActive}
                    onCheckedChange={() => toggleActive(b)}
                    disabled={updateB.isPending}
                  />
                  <span className="text-xs text-muted-foreground">{b.isActive ? "مفعّل" : "معطّل"}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                  تحرير
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleting(b)}>
                  حذف
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تحرير البث" : "بث جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>عنوان البث *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>نص رسالة البث *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ انتهاء الظهور (اختياري)</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
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

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف رسالة البث</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف رسالة البث نهائياً ولا يمكن التراجع. هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleteB.isPending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteB.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteB.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
