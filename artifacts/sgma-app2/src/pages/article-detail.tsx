import { useRoute, useLocation } from "wouter";
import { useGetArticle, getGetArticleQueryKey } from "@workspace/api-client-react";
import { ArticleImage } from "@/components/articles/ArticleImage";
import { ArticleStatusBadge } from "@/components/articles/ArticleStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, BookOpen, User } from "lucide-react";
import { formatArticleDate } from "@/lib/articles";
import { getStoredUser } from "@/lib/auth";
import { ViewCountBadge } from "@/components/engagement/ViewCountBadge";
import { ReactionBar } from "@/components/engagement/ReactionBar";
import type { ReactionType } from "@/lib/reactions";

export default function ArticleDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/articles/:id");
  const id = Number(params?.id);
  const validId = Number.isInteger(id);

  const { data: item, isLoading, isError } = useGetArticle(id, {
    query: { queryKey: getGetArticleQueryKey(id), enabled: validId, retry: false },
  });

  const notFound = isError || !validId;
  const currentUserId = getStoredUser()?.id;
  const isOwner = !!item && item.authorId === currentUserId;

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-3 py-3 backdrop-blur">
        <button
          onClick={() => setLocation("/articles")}
          aria-label="رجوع"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <h2 className="font-semibold">المقالات</h2>
      </header>

      {isLoading && validId && (
        <div className="pb-24">
          <Skeleton className="aspect-[16/9] w-full" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      )}

      {!isLoading && notFound && (
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center text-muted-foreground">
          <BookOpen className="mb-3 h-12 w-12 opacity-40" />
          <p className="mb-6">المقال غير موجود أو لم يعد متاحاً</p>
          <Button variant="outline" onClick={() => setLocation("/articles")}>
            <ArrowRight className="ml-1 h-4 w-4" />
            العودة إلى المقالات
          </Button>
        </div>
      )}

      {!isLoading && !notFound && item && (
        <article className="pb-24">
          <ArticleImage src={item.imageUrl} alt={item.title} className="w-full" maxHeightClass="max-h-[70vh]" />
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {item.category && <Badge variant="secondary">{item.category}</Badge>}
              {isOwner && <ArticleStatusBadge status={item.status} />}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatArticleDate(item.publishedAt ?? item.createdAt)}
              </span>
              <ViewCountBadge count={item.viewCount} />
            </div>

            <h1 className="text-xl font-bold leading-snug">{item.title}</h1>

            {item.authorName && (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {item.authorName}
              </span>
            )}

            {item.summary && (
              <p className="leading-relaxed text-muted-foreground">{item.summary}</p>
            )}

            <div className="whitespace-pre-wrap text-[15px] leading-loose text-foreground/90">
              {item.content}
            </div>

            {item.status === "APPROVED" && (
              <div className="border-t border-border pt-4">
                <ReactionBar
                  kind="article"
                  id={item.id}
                  summary={item.reactionSummary}
                  myReaction={(item.myReaction ?? null) as ReactionType | null}
                />
              </div>
            )}

            <Button variant="outline" className="mt-4 w-full" onClick={() => setLocation("/articles")}>
              <ArrowRight className="ml-1 h-4 w-4" />
              العودة إلى المقالات
            </Button>
          </div>
        </article>
      )}
    </div>
  );
}
