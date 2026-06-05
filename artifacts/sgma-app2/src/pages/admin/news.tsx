import { useState } from "react";
import {
  useGetAdminNews,
  useCreateNews,
  useUpdateNews,
  getGetAdminNewsQueryKey,
} from "@workspace/api-client-react";
import type {
  NewsItem,
  CreateNewsInput,
  UpdateNewsInput,
  GetAdminNewsStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { ImageInput } from "@/components/ImageInput";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, Plus } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  PUBLISHED: "default",
  ARCHIVED: "secondary",
};

type FormState = {
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  category: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  summary: "",
  content: "",
  imageUrl: "",
  category: "",
  status: "DRAFT",
};

export default function AdminNews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const params = statusFilter !== "ALL" ? { status: statusFilter as GetAdminNewsStatus } : {};

  const { data: news, isLoading, isError } = useGetAdminNews(params, {
    query: { queryKey: ["/api/admin/news", params], retry: false },
  });

  const createNews = useCreateNews();
  const updateNews = useUpdateNews();
  const saving = createNews.isPending || updateNews.isPending;

  function refetchList() {
    queryClient.invalidateQueries({ queryKey: getGetAdminNewsQueryKey(params) });
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(n: NewsItem) {
    setEditingId(n.id);
    setForm({
      title: n.title,
      summary: n.summary ?? "",
      content: n.content,
      imageUrl: n.imageUrl ?? "",
      category: n.category ?? "",
      status: n.status,
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "العنوان والمحتوى مطلوبان", variant: "destructive" });
      return;
    }

    const onError = (err: unknown) => {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر حفظ الخبر";
      toast({ title: msg, variant: "destructive" });
    };

    if (editingId) {
      const payload: UpdateNewsInput = {
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        content: form.content.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        category: form.category.trim() || undefined,
        status: form.status as UpdateNewsInput["status"],
      };
      updateNews.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast({ title: "تم تحديث الخبر" });
            refetchList();
            setDialogOpen(false);
          },
          onError,
        },
      );
    } else {
      const payload: CreateNewsInput = {
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        content: form.content.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        category: form.category.trim() || undefined,
        status: form.status as CreateNewsInput["status"],
      };
      createNews.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "تم إنشاء الخبر" });
            refetchList();
            setDialogOpen(false);
          },
          onError,
        },
      );
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto bg-muted/20 min-h-[100dvh]">
      <div className="pt-2">
        <BackButton fallback="/admin" />
      </div>
      <div className="px-2 flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">إدارة الأخبار</h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وتحرير ونشر الأخبار</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          خبر جديد
        </Button>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">كل الحالات</SelectItem>
          <SelectItem value="PUBLISHED">منشور</SelectItem>
          <SelectItem value="DRAFT">مسودة</SelectItem>
          <SelectItem value="ARCHIVED">مؤرشف</SelectItem>
        </SelectContent>
      </Select>

      {isError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">تعذر تحميل الأخبار، يرجى المحاولة لاحقاً</span>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !news || news.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">لا توجد أخبار في هذه الحالة</Card>
      ) : (
        <div className="space-y-2">
          {news.map((n) => (
            <Card key={n.id} className="p-4 shadow-sm border-border/50 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{n.title}</div>
                  {n.summary && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.summary}</p>
                  )}
                </div>
                <Badge variant={STATUS_VARIANT[n.status] ?? "secondary"}>
                  {STATUS_LABELS[n.status] ?? n.status}
                </Badge>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(n)}>
                  تحرير
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تحرير الخبر" : "خبر جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>العنوان *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>الملخص</Label>
              <Textarea
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>المحتوى *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label>التصنيف</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <ImageInput
              label="صورة الخبر"
              value={form.imageUrl}
              onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))}
            />
            <div className="space-y-1.5">
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">مسودة</SelectItem>
                  <SelectItem value="PUBLISHED">منشور</SelectItem>
                  <SelectItem value="ARCHIVED">مؤرشف</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
}
