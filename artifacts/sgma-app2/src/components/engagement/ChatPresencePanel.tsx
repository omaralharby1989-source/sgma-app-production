import { useEffect } from "react";
import {
  useGetChatPresence,
  useUpdateChatPresence,
  getGetChatPresenceQueryKey,
  type ChatPresenceUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatArabicNumber } from "@/lib/reactions";

interface ChatPresencePanelProps {
  roomType: "PUBLIC_CHAT" | "ADMIN_DIRECT_CHAT";
  roomKey: string;
  className?: string;
}

const HEARTBEAT_MS = 20000;

export function ChatPresencePanel({ roomType, roomKey, className }: ChatPresencePanelProps) {
  const queryClient = useQueryClient();
  const params = { roomType, roomKey };

  const heartbeat = useUpdateChatPresence();

  const { data } = useGetChatPresence(params, {
    query: {
      queryKey: getGetChatPresenceQueryKey(params),
      refetchInterval: HEARTBEAT_MS,
      retry: false,
    },
  });

  // Send a heartbeat on mount and on a steady interval so the user shows as online.
  useEffect(() => {
    let active = true;
    const ping = () => {
      heartbeat.mutate(
        { data: { roomType, roomKey } },
        {
          onSuccess: () => {
            if (active) {
              queryClient.invalidateQueries({ queryKey: getGetChatPresenceQueryKey(params) });
            }
          },
        },
      );
    };
    ping();
    const interval = setInterval(ping, HEARTBEAT_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomType, roomKey]);

  const count = data?.count ?? 0;
  const users: ChatPresenceUser[] = data?.users ?? [];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2",
        className,
      )}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      <span className="text-xs font-medium text-foreground">
        {formatArabicNumber(count)} متصل الآن
      </span>
      {users.length > 0 && (
        <span className="truncate text-[11px] text-muted-foreground">
          {users.map((u) => u.fullName).slice(0, 3).join("، ")}
          {users.length > 3 ? " ..." : ""}
        </span>
      )}
    </div>
  );
}
