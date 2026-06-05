import { Link } from "wouter";
import { useGetArticles, getGetArticlesQueryKey } from "@workspace/api-client-react";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, AlertCircle, PenLine, FolderOpen } from "lucide-react";

function ArticleSkeleton() {
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

export default function Articles() {
  const { data: articles, isLoading, isError } = useGetArticles({
    query: { queryKey: getGetArticlesQueryKey(), retry: false },
  });

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg bg-muted/20">
      <header className="border-b border-border bg-card px-4 pb-4 pt-6">
        <h1 className="text-2xl font-bold">المقالات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مقالات علمية ومهنية من أعضاء الجمعية
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button asChild className="gap-2">
            <Link href="/articles/new">
              <PenLine className="h-4 w-4" />
              كتابة مقال
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/articles/my">
              <FolderOpen className="h-4 w-4" />
              مقالاتي
            </Link>
          </Button>
        </div>
      </header>

      <div className="space-y-4 p-4">
        {isLoading && (
          <>
            <ArticleSkeleton />
            <ArticleSkeleton />
            <ArticleSkeleton />
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
            <BookOpen className="mb-3 h-12 w-12 opacity-40" />
            <p>لا توجد مقالات منشورة حالياً</p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          articles &&
          articles.map((item) => <ArticleCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}
