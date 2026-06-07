import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatArabicNumber } from "@/lib/reactions";

export function ViewCountBadge({
  count,
  className,
}: {
  count: number | null | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn("flex items-center gap-1 text-[11px] text-muted-foreground", className)}
      title="عدد المشاهدات"
    >
      <Eye className="h-3.5 w-3.5" />
      {formatArabicNumber(count)}
    </span>
  );
}
