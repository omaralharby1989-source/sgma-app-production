import type { ArticleStatus } from "@workspace/api-client-react";

export function formatArticleDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  DRAFT: "مسودة",
  PENDING: "قيد المراجعة",
  APPROVED: "منشور",
  REJECTED: "مرفوض",
  ARCHIVED: "مؤرشف",
};

export const ARTICLE_STATUS_STYLES: Record<ArticleStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export function canEditArticle(status: ArticleStatus): boolean {
  return status === "DRAFT" || status === "PENDING";
}
