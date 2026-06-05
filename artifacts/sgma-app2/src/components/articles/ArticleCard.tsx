import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowLeft, User } from "lucide-react";
import { ArticleImage } from "./ArticleImage";
import { formatArticleDate } from "@/lib/articles";
import type { ArticleItem } from "@workspace/api-client-react";

export function ArticleCard({ item }: { item: ArticleItem }) {
  return (
    <Link href={`/articles/${item.id}`} className="block">
      <Card className="overflow-hidden border-border/50 border-r-4 border-r-primary/60 shadow-sm transition-colors hover:bg-muted/30 active:bg-muted/50">
        <ArticleImage src={item.imageUrl} alt={item.title} className="aspect-[16/9] w-full" />
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {item.category && (
              <Badge variant="secondary" className="text-[11px]">
                {item.category}
              </Badge>
            )}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {formatArticleDate(item.publishedAt ?? item.createdAt)}
            </span>
          </div>
          <h3 className="line-clamp-2 font-bold leading-snug">{item.title}</h3>
          {item.summary && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            {item.authorName && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <User className="h-3 w-3" />
                {item.authorName}
              </span>
            )}
            <span className="flex items-center gap-1 text-sm font-medium text-primary">
              قراءة المقال
              <ArrowLeft className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
