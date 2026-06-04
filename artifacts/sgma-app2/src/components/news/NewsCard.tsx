import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { NewsImage } from "./NewsImage";
import { formatNewsDate } from "@/lib/news";
import type { NewsItem } from "@workspace/api-client-react";

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Link href={`/news/${item.id}`} className="block">
      <Card className="overflow-hidden border-border/50 shadow-sm transition-colors hover:bg-muted/30 active:bg-muted/50">
        <NewsImage src={item.imageUrl} alt={item.title} className="aspect-[16/9] w-full" />
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {item.category && (
              <Badge variant="secondary" className="text-[11px]">
                {item.category}
              </Badge>
            )}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {formatNewsDate(item.publishedAt ?? item.createdAt)}
            </span>
          </div>
          <h3 className="line-clamp-2 font-bold leading-snug">{item.title}</h3>
          {item.summary && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          )}
          <div className="flex items-center gap-1 pt-1 text-sm font-medium text-primary">
            اقرأ المزيد
            <ArrowLeft className="h-4 w-4" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
