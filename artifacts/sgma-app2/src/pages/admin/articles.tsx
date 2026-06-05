import { useState } from "react";
import {
  useGetAdminArticles,
  useApproveArticle,
  useRejectArticle,
  useArchiveArticle,
  getGetAdminArticlesQueryKey,
} from "@workspace/api-client-react";
import type { ArticleItem, ArticleStatus } from "@workspace/api-client-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  PENDING: "بانتظار المراجعة",
  APPROVED: "منشور",
  REJECTED: "مرفوض",
  ARCHIVED: "مؤرشف",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  ARCHIVED: "outline",
};

export default function AdminArticles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [rejecting, setRejecting] = useState<ArticleItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [archiving, setArchiving] = useState<ArticleItem | null>(null);

  const params = statusFilter !== "ALL" ? { status: statusFilter as ArticleStatus } : {};

  const { data: articles, isLoading, isError } = useGetAdminArticles(params, {
    query: { queryKey: ["/api/admin/articles", params], retry: false },
  });

  const approve = useApproveArticle();
  const reject = useRejectArticle();
  const archive = useArchiveArticle();

  function refetchList() {
    queryClient.invalidateQueries({ queryKey: getGetAdminArticlesQueryKey(params) });
  }

  function handleApprove(a: ArticleItem) {
    approve.mutate(
      { id: a.id },
      {
        onSuccess: () => {
          toast({ title: "تم نشر المقال" });
          refetchList();
        },
        onError: (err) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر نشر المقال";
          toast({ title: msg, variant: "destructive" });
        },
      },
    );
  }

  function handleReject() {
    if (!rejecting) return;
    reject.mutate(
      { id: rejecting.id, data: { reason: rejectReason.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "تم رفض المقال" });
          refetchList();
          setRejecting(null);
          setRejectReason("");
        },
        onError: (err) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر رفض المقال";
          toast({ title: msg, variant: "destructive" });
        },
      },
    );
  }

  function handleArchive() {
    if (!archiving) return;
    archive.mutate(
      { id: archiving.id },
      {
        onSuccess: () => {
          toast({ title: "تم أرشفة المقال" });
          refetchList();
          setArchiving(null);
        },
        onError: (err) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "تعذر أرشفة المقال";
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
      <div className="px-2">
        <h1 className="text-2xl font-bold">إدارة المقالات</h1>
        <p className="text-muted-foreground text-sm mt-1">مراجعة ونشر وأرشفة مقالات الأعضاء</p>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">كل الحالات</SelectItem>
          <SelectItem value="PENDING">بانتظار المراجعة</SelectItem>
          <SelectItem value="APPROVED">منشور</SelectItem>
          <SelectItem value="REJECTED">مرفوض</SelectItem>
          <SelectItem value="DRAFT">مسودة</SelectItem>
          <SelectItem value="ARCHIVED">مؤرشف</SelectItem>
        </SelectContent>
      </Select>

      {isError ? (
        <Card className="p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">تعذر تحميل المقالات، يرجى المحاولة لاحقاً</span>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : !articles || articles.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">لا توجد مقالات في هذه الحالة</Card>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <Card key={a.id} className="p-4 shadow-sm border-border/50 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{a.title}</div>
                  {a.authorName && (
                    <div className="text-xs text-muted-foreground mt-0.5">بقلم: {a.authorName}</div>
                  )}
                  {a.summary && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.summary}</p>
                  )}
                </div>
                <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"}>
                  {STATUS_LABELS[a.status] ?? a.status}
                </Badge>
              </div>
              {a.status === "REJECTED" && a.rejectionReason && (
                <p className="text-xs text-destructive">سبب الرفض: {a.rejectionReason}</p>
              )}
              <div className="flex gap-2 flex-wrap pt-1">
                {a.status === "PENDING" && (
                  <>
                    <Button size="sm" onClick={() => handleApprove(a)} disabled={approve.isPending}>
                      نشر
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejecting(a);
                        setRejectReason("");
                      }}
                    >
                      رفض
                    </Button>
                  </>
                )}
                {a.status !== "ARCHIVED" && (
                  <Button size="sm" variant="ghost" onClick={() => setArchiving(a)}>
                    أرشفة
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject dialog with reason */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض المقال</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>سبب الرفض (اختياري)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب الرفض ليطّلع عليه الكاتب"
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={reject.isPending}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={reject.isPending}>
              {reject.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirm */}
      <AlertDialog open={!!archiving} onOpenChange={(o) => !o && setArchiving(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>أرشفة المقال</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم نقل المقال إلى الأرشيف ولن يظهر للأعضاء. هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={archive.isPending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archive.isPending}>
              {archive.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
