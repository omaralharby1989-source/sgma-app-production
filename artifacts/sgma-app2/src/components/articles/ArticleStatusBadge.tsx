import type { ArticleStatus } from "@workspace/api-client-react";
import { ARTICLE_STATUS_LABELS, ARTICLE_STATUS_STYLES } from "@/lib/articles";

export function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${ARTICLE_STATUS_STYLES[status]}`}
    >
      {ARTICLE_STATUS_LABELS[status]}
    </span>
  );
}
