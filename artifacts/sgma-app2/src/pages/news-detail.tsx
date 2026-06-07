import { useRoute, useLocation } from "wouter";
import { useGetNewsItem, getGetNewsItemQueryKey } from "@workspace/api-client-react";
import { NewsImage } from "@/components/news/NewsImage";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, Newspaper } from "lucide-react";
import { formatNewsDate } from "@/lib/news";
import { ViewCountBadge } from "@/components/engagement/ViewCountBadge";
import { ReactionBar } from "@/components/engagement/ReactionBar";
import type { ReactionType } from "@/lib/reactions";

export default function NewsDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/news/:id");
  const id = Number(params?.id);
  const validId = Number.isInteger(id);

  const { data: item, isLoading, isError } = useGetNewsItem(id, {
    query: { queryKey: getGetNewsItemQueryKey(id), enabled: validId, retry: false },
  });

  const notFound = isError || !validId;

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-3 py-3 backdrop-blur">
        <button
          onClick={() => setLocation("/news")}
          aria-label="رجوع"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <h2 className="font-semibold">الأخبار</h2>
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
          <Newspaper className="mb-3 h-12 w-12 opacity-40" />
          <p className="mb-6">الخبر غير موجود أو لم يعد متاحاً</p>
          <Button variant="outline" onClick={() => setLocation("/news")}>
            <ArrowRight className="ml-1 h-4 w-4" />
            العودة إلى الأخبار
          </Button>
        </div>
      )}

      {!isLoading && !notFound && item && (
        <article className="pb-24">
          <NewsImage src={item.imageUrl} alt={item.title} className="w-full" maxHeightClass="max-h-[70vh]" />
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {item.category && <Badge variant="secondary">{item.category}</Badge>}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatNewsDate(item.publishedAt ?? item.createdAt)}
              </span>
              <ViewCountBadge count={item.viewCount} />
            </div>

            <h1 className="text-xl font-bold leading-snug">{item.title}</h1>

            {item.summary && (
              <p className="leading-relaxed text-muted-foreground">{item.summary}</p>
            )}

            <div className="whitespace-pre-wrap text-[15px] leading-loose text-foreground/90">
              {item.content}
            </div>

            <div className="border-t border-border pt-4">
              <ReactionBar
                kind="news"
                id={item.id}
                summary={item.reactionSummary}
                myReaction={(item.myReaction ?? null) as ReactionType | null}
              />
            </div>

            <Button variant="outline" className="mt-4 w-full" onClick={() => setLocation("/news")}>
              <ArrowRight className="ml-1 h-4 w-4" />
              العودة إلى الأخبار
            </Button>
          </div>
        </article>
      )}
    </div>
  );
}
