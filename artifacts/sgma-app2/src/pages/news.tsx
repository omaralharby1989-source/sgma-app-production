import { useGetNewsList, getGetNewsListQueryKey } from "@workspace/api-client-react";
import { NewsCard } from "@/components/news/NewsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, AlertCircle } from "lucide-react";

function NewsSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      <Skeleton className="aspect-[16/9] w-full" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export default function News() {
  const { data: news, isLoading, isError } = useGetNewsList({
    query: { queryKey: getGetNewsListQueryKey(), retry: false },
  });

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg bg-muted/20">
      <header className="border-b border-border bg-card px-4 pb-4 pt-6">
        <h1 className="text-2xl font-bold">الأخبار</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          آخر أخبار ونشاطات الجمعية الطبية السورية الألمانية
        </p>
      </header>

      <div className="space-y-4 p-4">
        {isLoading && (
          <>
            <NewsSkeleton />
            <NewsSkeleton />
            <NewsSkeleton />
          </>
        )}

        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <AlertCircle className="mb-3 h-12 w-12 opacity-40" />
            <p>تعذر تحميل الأخبار، يرجى المحاولة لاحقاً</p>
          </div>
        )}

        {!isLoading && !isError && news && news.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Newspaper className="mb-3 h-12 w-12 opacity-40" />
            <p>لا توجد أخبار منشورة حالياً</p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          news &&
          news.map((item) => <NewsCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}
