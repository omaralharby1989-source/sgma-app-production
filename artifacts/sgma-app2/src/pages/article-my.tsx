import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetMyArticles,
  getGetMyArticlesQueryKey,
  useDeleteArticle,
  getGetArticlesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/BackButton";
import { ArticleStatusBadge } from "@/components/articles/ArticleStatusBadge";
import {
  AlertCircle,
  FileText,
  CalendarDays,
  Eye,
  Pencil,
  Archive,
  Loader2,
  PenLine,
} from "lucide-react";
import { formatArticleDate, canEditArticle } from "@/lib/articles";
import { useToast } from "@/hooks/use-toast";

export default function ArticleMy() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const { data: articles, isLoading, isError } = useGetMyArticles({
    query: { queryKey: getGetMyArticlesQueryKey(), retry: false },
  });

  const deleteMutation = useDeleteArticle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyArticlesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetArticlesQueryKey() });
        toast({ title: "تم أرشفة المقال" });
      },
      onError: () => {
        toast({ variant: "destructive", title: "تعذر أرشفة المقال" });
      },
      onSettled: () => setPendingId(null),
    },
  });

  const handleArchive = (id: number) => {
    if (!window.confirm("هل تريد أرشفة هذا المقال؟")) return;
    setPendingId(id);
    deleteMutation.mutate({ id });
  };

  return (
    <div className="min-h-[100dvh] bg-muted/20 p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between pt-2 pb-4">
        <h1 className="text-2xl font-bold">مقالاتي</h1>
        <BackButton fallback="/articles" />
      </div>

      <Button asChild className="mb-4 w-full gap-2">
        <Link href="/articles/new">
          <PenLine className="h-4 w-4" />
          كتابة مقال جديد
        </Link>
      </Button>

      <div className="space-y-3">
        {isLoading && (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </>
        )}

        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <AlertCircle className="mb-3 h-12 w-12 opacity-40" />
            <p>تعذر تحميل المقالات، يرجى المحاولة لاحقاً</p>
          </div>
        )}

        {!isLoading && !isError && articles && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <FileText className="mb-3 h-12 w-12 opacity-40" />
            <p>لم تقم بإرسال أي مقالات بعد</p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          articles &&
          articles.map((item) => (
            <Card key={item.id} className="border-border/50 p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 font-bold leading-snug">{item.title}</h3>
                <ArticleStatusBadge status={item.status} />
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {item.category && <span>{item.category}</span>}
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatArticleDate(item.createdAt)}
                </span>
              </div>

              {item.summary && (
                <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>
              )}

              {item.status === "REJECTED" && item.rejectionReason && (
                <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
                  سبب الرفض: {item.rejectionReason}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setLocation(`/articles/${item.id}`)}
                >
                  <Eye className="h-4 w-4" />
                  عرض
                </Button>

                {canEditArticle(item.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setLocation(`/articles/${item.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                    تعديل
                  </Button>
                )}

                {canEditArticle(item.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    disabled={deleteMutation.isPending && pendingId === item.id}
                    onClick={() => handleArchive(item.id)}
                  >
                    {deleteMutation.isPending && pendingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    أرشفة
                  </Button>
                )}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
