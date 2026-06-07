import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSetNewsReaction,
  useSetArticleReaction,
  getGetNewsListQueryKey,
  getGetNewsItemQueryKey,
  getGetArticlesQueryKey,
  getGetArticleQueryKey,
  type ReactionSummary,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  REACTION_ORDER,
  REACTION_META,
  formatArabicNumber,
  type ReactionType,
} from "@/lib/reactions";

interface ReactionBarProps {
  kind: "news" | "article";
  id: number;
  summary: ReactionSummary | undefined;
  myReaction: ReactionType | null | undefined;
}

const EMPTY_SUMMARY: ReactionSummary = {
  total: 0,
  counts: { LIKE: 0, LOVE: 0, SUPPORT: 0, THANKS: 0, INSIGHTFUL: 0 },
};

export function ReactionBar({ kind, id, summary, myReaction }: ReactionBarProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [localSummary, setLocalSummary] = useState<ReactionSummary>(summary ?? EMPTY_SUMMARY);
  const [localMine, setLocalMine] = useState<ReactionType | null>(myReaction ?? null);

  useEffect(() => {
    setLocalSummary(summary ?? EMPTY_SUMMARY);
  }, [summary]);
  useEffect(() => {
    setLocalMine(myReaction ?? null);
  }, [myReaction]);

  const newsMutation = useSetNewsReaction();
  const articleMutation = useSetArticleReaction();
  const isPending = newsMutation.isPending || articleMutation.isPending;

  function invalidate() {
    if (kind === "news") {
      queryClient.invalidateQueries({ queryKey: getGetNewsListQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetNewsItemQueryKey(id) });
    } else {
      queryClient.invalidateQueries({ queryKey: getGetArticlesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetArticleQueryKey(id) });
    }
  }

  function handleReact(type: ReactionType) {
    if (isPending) return;
    const target: ReactionType | null = localMine === type ? null : type;

    const onSuccess = (data: { summary: ReactionSummary; myReaction?: ReactionType | null }) => {
      setLocalSummary(data.summary);
      setLocalMine((data.myReaction as ReactionType | null) ?? null);
      invalidate();
    };
    const onError = () => {
      toast({
        variant: "destructive",
        title: "تعذر تسجيل التفاعل",
        description: "يرجى المحاولة مرة أخرى",
      });
    };

    if (kind === "news") {
      newsMutation.mutate({ id, data: { reactionType: target } }, { onSuccess, onError });
    } else {
      articleMutation.mutate({ id, data: { reactionType: target } }, { onSuccess, onError });
    }
  }

  const counts = localSummary.counts;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {REACTION_ORDER.map((type) => {
          const meta = REACTION_META[type];
          const active = localMine === type;
          const count = counts[type] ?? 0;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleReact(type)}
              disabled={isPending}
              aria-pressed={active}
              aria-label={meta.label}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-60",
                active
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50",
              )}
            >
              <span className="text-sm leading-none">{meta.emoji}</span>
              {count > 0 && <span>{formatArabicNumber(count)}</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {localSummary.total > 0
          ? `${formatArabicNumber(localSummary.total)} تفاعل`
          : "كن أول من يتفاعل"}
      </p>
    </div>
  );
}
