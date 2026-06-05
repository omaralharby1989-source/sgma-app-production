import { useState } from "react";
import { useGetActiveBroadcasts, getGetActiveBroadcastsQueryKey } from "@workspace/api-client-react";
import { Megaphone, X } from "lucide-react";

export function BroadcastBanner() {
  const { data: broadcasts } = useGetActiveBroadcasts({
    query: { queryKey: getGetActiveBroadcastsQueryKey(), retry: false, refetchInterval: 60000 },
  });
  const [dismissed, setDismissed] = useState<number[]>([]);

  if (!broadcasts || broadcasts.length === 0) return null;

  const visible = broadcasts.filter((b) => !dismissed.includes(b.id));
  if (visible.length === 0) return null;

  return (
    <div className="px-3 pt-3 space-y-2 max-w-lg mx-auto">
      {visible.map((b) => (
        <div
          key={b.id}
          className="relative flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 shadow-sm"
        >
          <div className="shrink-0 h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pl-5">
            <p className="text-sm font-semibold text-primary leading-tight">{b.title}</p>
            <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed break-words">
              {b.content}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed((prev) => [...prev, b.id])}
            aria-label="إغلاق التنبيه"
            className="absolute top-2 left-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
