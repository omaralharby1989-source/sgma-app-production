import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAdminChatMessages,
  useSendAdminChatMessage,
  useEditAdminChatMessage,
  useDeleteAdminChatMessage,
  useGetAdminChatConversations,
  getGetAdminChatMessagesQueryKey,
  getGetAdminChatConversationsQueryKey,
} from "@workspace/api-client-react";
import type { AdminConversation } from "@workspace/api-client-react";
import { ChatThread } from "@/components/chat/ChatThread";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getStoredUser, isStaffRole } from "@/lib/auth";
import { ROLE_ARABIC } from "@/lib/constants";
import { ArrowRight, Inbox, Headset } from "lucide-react";

function timeAgo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ar", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function initials(name: string): string {
  return name?.trim()?.charAt(0)?.toUpperCase() || "؟";
}

function MemberView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = getGetAdminChatMessagesQueryKey();

  const { data: messages, isLoading } = useGetAdminChatMessages(undefined, {
    query: { queryKey, refetchInterval: 7000 },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  const onError = (error: any) =>
    toast({
      title: "حدث خطأ",
      description: error?.data?.error || "الرجاء المحاولة مرة أخرى",
      variant: "destructive",
    });

  const sendMutation = useSendAdminChatMessage({ mutation: { onSuccess: invalidate, onError } });
  const editMutation = useEditAdminChatMessage({ mutation: { onSuccess: invalidate, onError } });
  const deleteMutation = useDeleteAdminChatMessage({ mutation: { onSuccess: invalidate, onError } });

  return (
    <ChatThread
      messages={messages ?? []}
      isLoading={isLoading}
      isSending={sendMutation.isPending}
      showSenderName
      emptyText="ابدأ محادثة مع فريق الإدارة. سيتم الرد عليك في أقرب وقت."
      placeholder="اكتب رسالتك لفريق الإدارة..."
      onSend={(content) => sendMutation.mutate({ data: { content } })}
      onEdit={(id, content) => editMutation.mutate({ id, data: { content } })}
      onDelete={(id) => deleteMutation.mutate({ id })}
    />
  );
}

function StaffView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selected, setSelected] = useState<AdminConversation | null>(null);

  const convKey = getGetAdminChatConversationsQueryKey();

  const { data: conversations, isLoading: convLoading } = useGetAdminChatConversations({
    query: { queryKey: convKey, refetchInterval: 10000 },
  });

  const params = selected ? { userId: selected.userId } : undefined;
  const messagesKey = getGetAdminChatMessagesQueryKey(params);

  const { data: messages, isLoading: msgLoading } = useGetAdminChatMessages(params, {
    query: { queryKey: messagesKey, refetchInterval: 7000, enabled: !!selected },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: messagesKey });
    queryClient.invalidateQueries({ queryKey: convKey });
  };
  const onError = (error: any) =>
    toast({
      title: "حدث خطأ",
      description: error?.data?.error || "الرجاء المحاولة مرة أخرى",
      variant: "destructive",
    });

  const sendMutation = useSendAdminChatMessage({ mutation: { onSuccess: invalidate, onError } });
  const editMutation = useEditAdminChatMessage({ mutation: { onSuccess: invalidate, onError } });
  const deleteMutation = useDeleteAdminChatMessage({ mutation: { onSuccess: invalidate, onError } });

  if (selected) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-2">
          <button onClick={() => setSelected(null)} aria-label="رجوع للقائمة" className="text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-5 w-5" />
          </button>
          <Avatar className="h-8 w-8">
            {selected.avatarUrl && <AvatarImage src={selected.avatarUrl} alt={selected.fullName} />}
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials(selected.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{selected.fullName}</p>
            <p className="text-[11px] text-muted-foreground">{ROLE_ARABIC[selected.role] ?? selected.role}</p>
          </div>
        </div>
        <ChatThread
          messages={messages ?? []}
          isLoading={msgLoading}
          isSending={sendMutation.isPending}
          showSenderName
          placeholder="اكتب ردّك للعضو..."
          onSend={(content) => sendMutation.mutate({ data: { content, recipientId: selected.userId } })}
          onEdit={(id, content) => editMutation.mutate({ id, data: { content } })}
          onDelete={(id) => deleteMutation.mutate({ id })}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {convLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-3 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </Card>
        ))
      ) : !conversations || conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60dvh] text-center text-muted-foreground gap-2 px-6">
          <Inbox className="h-10 w-10 opacity-40" />
          <p className="text-sm">لا توجد محادثات من الأعضاء بعد.</p>
        </div>
      ) : (
        conversations.map((c) => (
          <button key={c.userId} onClick={() => setSelected(c)} className="w-full text-right">
            <Card className="p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors border-border/50">
              <Avatar className="h-10 w-10 shrink-0">
                {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.fullName} />}
                <AvatarFallback className="bg-primary/10 text-primary">{initials(c.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{c.fullName}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.lastMessageAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage ?? ""}</p>
              </div>
            </Card>
          </button>
        ))
      )}
    </div>
  );
}

export default function ChatAdmin() {
  const [, setLocation] = useLocation();
  const user = getStoredUser();
  const staff = isStaffRole(user?.role);

  return (
    <div className="max-w-lg mx-auto bg-background min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-3 py-3">
        <button onClick={() => setLocation("/chat")} aria-label="رجوع" className="text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Headset className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h1 className="font-semibold leading-tight">
              {staff ? "محادثات الأعضاء" : "التواصل مع الإدارة"}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {staff ? "ردّ على رسائل الأعضاء" : "محادثة خاصة مع فريق الإدارة"}
            </p>
          </div>
        </div>
      </header>

      {staff ? <StaffView /> : <MemberView />}
    </div>
  );
}
